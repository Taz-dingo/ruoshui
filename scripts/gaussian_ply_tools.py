#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import numpy as np


PLY_TYPE_TO_DTYPE = {
    "char": "i1",
    "uchar": "u1",
    "int8": "i1",
    "uint8": "u1",
    "short": "<i2",
    "ushort": "<u2",
    "int16": "<i2",
    "uint16": "<u2",
    "int": "<i4",
    "uint": "<u4",
    "int32": "<i4",
    "uint32": "<u4",
    "float": "<f4",
    "float32": "<f4",
    "double": "<f8",
    "float64": "<f8",
}


def read_header(path: Path) -> tuple[bytes, list[str], int]:
    with path.open("rb") as fh:
        header = bytearray()
        while True:
            line = fh.readline()
            if not line:
                raise ValueError("unexpected EOF while reading PLY header")
            header.extend(line)
            if line == b"end_header\n":
                break
    return bytes(header), header.decode("ascii").splitlines(), len(header)


def parse_vertex_schema(header_lines: Iterable[str]) -> tuple[int, np.dtype]:
    in_vertex = False
    vertex_count = None
    fields: list[tuple[str, str]] = []

    for line in header_lines:
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "element":
            in_vertex = parts[1] == "vertex"
            if in_vertex:
                vertex_count = int(parts[2])
            continue
        if in_vertex and parts[0] == "property":
            if parts[1] == "list":
                raise ValueError("list properties are not supported")
            dtype = PLY_TYPE_TO_DTYPE.get(parts[1])
            if dtype is None:
                raise ValueError(f"unsupported PLY property type: {parts[1]}")
            fields.append((parts[2], dtype))
        if in_vertex and parts[0] == "end_header":
            break
        if in_vertex and parts[0] == "element" and parts[1] != "vertex":
            break

    if vertex_count is None:
        raise ValueError("vertex element not found in PLY header")
    if not fields:
        raise ValueError("no vertex properties found in PLY header")

    return vertex_count, np.dtype(fields)


def load_vertices(path: Path) -> tuple[np.ndarray, bytes, list[str]]:
    header_bytes, header_lines, data_offset = read_header(path)
    vertex_count, dtype = parse_vertex_schema(header_lines)
    arr = np.memmap(path, dtype=dtype, mode="r", offset=data_offset, shape=(vertex_count,))
    return arr, header_bytes, header_lines


def percentile_dict(values: np.ndarray, percentiles: list[float]) -> dict[str, float]:
    result = np.percentile(values.astype(np.float64), percentiles)
    return {str(p): float(v) for p, v in zip(percentiles, result)}


def summary_command(args: argparse.Namespace) -> int:
    vertices, _, _ = load_vertices(Path(args.input))
    if not {"x", "y", "z"}.issubset(vertices.dtype.names or ()):
        raise ValueError("PLY vertex schema must contain x/y/z properties")

    percentiles = [0, 0.1, 0.5, 1, 2, 5, 10, 25, 50, 75, 90, 95, 98, 99, 99.5, 99.9, 100]
    summary = {
        "input": args.input,
        "vertex_count": int(vertices.shape[0]),
        "bbox": {},
        "percentiles": {},
    }

    for axis in ("x", "y", "z"):
        axis_values = vertices[axis].astype(np.float64)
        summary["bbox"][axis] = {
            "min": float(axis_values.min()),
            "max": float(axis_values.max()),
            "extent": float(axis_values.max() - axis_values.min()),
        }
        summary["percentiles"][axis] = percentile_dict(axis_values, percentiles)

    if "opacity" in vertices.dtype.names:
        summary["percentiles"]["opacity"] = percentile_dict(
            vertices["opacity"].astype(np.float64),
            [0, 1, 5, 10, 25, 50, 75, 90, 95, 99, 100],
        )

    for lo, hi in ((0.1, 99.9), (0.5, 99.5), (1, 99), (2, 98), (5, 95)):
        mask = np.ones(vertices.shape[0], dtype=bool)
        bounds = {}
        for axis in ("x", "y", "z"):
            mn, mx = np.percentile(vertices[axis].astype(np.float64), [lo, hi])
            bounds[axis] = {"min": float(mn), "max": float(mx)}
            mask &= (vertices[axis] >= mn) & (vertices[axis] <= mx)
        summary.setdefault("candidate_boxes", {})[f"p{lo}-p{hi}"] = {
            "keep_count": int(mask.sum()),
            "keep_ratio": float(mask.sum() / vertices.shape[0]),
            "bounds": bounds,
        }

    output = json.dumps(summary, indent=2, ensure_ascii=False)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output + "\n", encoding="utf-8")
    print(output)
    return 0


def rewrite_header_vertex_count(header_lines: list[str], new_count: int) -> bytes:
    rewritten = []
    for line in header_lines:
        if line.startswith("element vertex "):
            rewritten.append(f"element vertex {new_count}\n")
        else:
            rewritten.append(line + "\n")
    return "".join(rewritten).encode("ascii")


def filter_box_command(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    output_path = Path(args.output)
    vertices, _, header_lines = load_vertices(input_path)
    if not {"x", "y", "z"}.issubset(vertices.dtype.names or ()):
        raise ValueError("PLY vertex schema must contain x/y/z properties")

    mask = np.ones(vertices.shape[0], dtype=bool)
    bounds_summary = {}
    for axis, lower, upper in (
        ("x", args.x_min, args.x_max),
        ("y", args.y_min, args.y_max),
        ("z", args.z_min, args.z_max),
    ):
        if lower is not None:
            mask &= vertices[axis] >= lower
        if upper is not None:
            mask &= vertices[axis] <= upper
        bounds_summary[axis] = {"min": lower, "max": upper}

    filtered = np.asarray(vertices[mask])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as fh:
        fh.write(rewrite_header_vertex_count(header_lines, filtered.shape[0]))
        fh.write(filtered.tobytes())

    summary = {
        "input": str(input_path),
        "output": str(output_path),
        "original_count": int(vertices.shape[0]),
        "kept_count": int(filtered.shape[0]),
        "kept_ratio": float(filtered.shape[0] / vertices.shape[0]),
        "bounds": bounds_summary,
    }
    if args.summary_json:
        Path(args.summary_json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.summary_json).write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Analyze and crop Gaussian PLY files.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    summary = subparsers.add_parser("summary", help="Write spatial summary for a PLY file.")
    summary.add_argument("input", help="Input PLY file")
    summary.add_argument("--output", help="Optional JSON output path")
    summary.set_defaults(func=summary_command)

    filter_box = subparsers.add_parser("filter-box", help="Crop a PLY file by axis-aligned bounds.")
    filter_box.add_argument("input", help="Input PLY file")
    filter_box.add_argument("output", help="Output PLY file")
    filter_box.add_argument("--x-min", type=float)
    filter_box.add_argument("--x-max", type=float)
    filter_box.add_argument("--y-min", type=float)
    filter_box.add_argument("--y-max", type=float)
    filter_box.add_argument("--z-min", type=float)
    filter_box.add_argument("--z-max", type=float)
    filter_box.add_argument("--summary-json", help="Optional JSON summary path")
    filter_box.set_defaults(func=filter_box_command)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
