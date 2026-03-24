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


def percentile_values(values: np.ndarray, percentiles: list[float]) -> tuple[np.ndarray, dict[str, float]]:
    result = np.percentile(values.astype(np.float64), percentiles)
    return result, {str(p): float(v) for p, v in zip(percentiles, result)}


def percentile_dict(values: np.ndarray, percentiles: list[float]) -> dict[str, float]:
    _, summary = percentile_values(values, percentiles)
    return summary


def compute_max_scale(vertices: np.ndarray) -> np.ndarray | None:
    names = vertices.dtype.names or ()
    scale_fields = [name for name in ("scale_0", "scale_1", "scale_2") if name in names]
    if not scale_fields:
        return None
    return np.maximum.reduce([vertices[name].astype(np.float64) for name in scale_fields])


def compute_bbox(vertices: np.ndarray) -> dict[str, dict[str, float]]:
    bbox = {}
    for axis in ("x", "y", "z"):
        axis_values = vertices[axis].astype(np.float64)
        bbox[axis] = {
            "min": float(axis_values.min()),
            "max": float(axis_values.max()),
            "extent": float(axis_values.max() - axis_values.min()),
        }
    return bbox


def cleanup_mask(
    vertices: np.ndarray,
    *,
    z_min: float | None = None,
    max_scale_max: float | None = None,
) -> np.ndarray:
    mask = np.ones(vertices.shape[0], dtype=bool)
    if z_min is not None:
        mask &= vertices["z"] >= z_min
    if max_scale_max is not None:
        max_scale = compute_max_scale(vertices)
        if max_scale is None:
            raise ValueError("PLY vertex schema must contain scale_0/1/2 properties")
        mask &= max_scale <= max_scale_max
    return mask


def cleanup_summary(
    vertices: np.ndarray,
    *,
    mask: np.ndarray,
    z_min: float | None,
    max_scale_max: float | None,
    z_min_percentile: float | None = None,
    max_scale_percentile: float | None = None,
) -> dict[str, object]:
    filtered = np.asarray(vertices[mask])
    summary: dict[str, object] = {
        "original_count": int(vertices.shape[0]),
        "kept_count": int(filtered.shape[0]),
        "removed_count": int(vertices.shape[0] - filtered.shape[0]),
        "kept_ratio": float(filtered.shape[0] / vertices.shape[0]),
        "removed_ratio": float(1.0 - filtered.shape[0] / vertices.shape[0]),
        "bounds": {
            "z_min": z_min,
            "max_scale_max": max_scale_max,
        },
        "percentiles": {
            "z_min_percentile": z_min_percentile,
            "max_scale_percentile": max_scale_percentile,
        },
    }
    if filtered.shape[0]:
        summary["bbox"] = compute_bbox(filtered)
    return summary


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

    max_scale = compute_max_scale(vertices)
    if max_scale is not None:
        summary["percentiles"]["max_scale"] = percentile_dict(
            max_scale,
            [0, 0.1, 0.5, 1, 2, 5, 10, 25, 50, 75, 90, 95, 98, 99, 99.5, 99.9, 99.95, 99.99, 100],
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


def filter_cleanup_command(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    output_path = Path(args.output)
    vertices, _, header_lines = load_vertices(input_path)
    if not {"x", "y", "z"}.issubset(vertices.dtype.names or ()):
        raise ValueError("PLY vertex schema must contain x/y/z properties")

    z_min = args.z_min
    z_min_percentile = None
    if args.z_min_percentile is not None:
        z_min_percentile = args.z_min_percentile
        z_min = float(np.percentile(vertices["z"].astype(np.float64), z_min_percentile))

    max_scale_max = args.max_scale_max
    max_scale_percentile = None
    if args.max_scale_percentile is not None:
        max_scale_percentile = args.max_scale_percentile
        max_scale = compute_max_scale(vertices)
        if max_scale is None:
            raise ValueError("PLY vertex schema must contain scale_0/1/2 properties")
        max_scale_max = float(np.percentile(max_scale, max_scale_percentile))

    mask = cleanup_mask(vertices, z_min=z_min, max_scale_max=max_scale_max)
    filtered = np.asarray(vertices[mask])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as fh:
        fh.write(rewrite_header_vertex_count(header_lines, filtered.shape[0]))
        fh.write(filtered.tobytes())

    summary = cleanup_summary(
        vertices,
        mask=mask,
        z_min=z_min,
        max_scale_max=max_scale_max,
        z_min_percentile=z_min_percentile,
        max_scale_percentile=max_scale_percentile,
    )
    summary["input"] = str(input_path)
    summary["output"] = str(output_path)
    if args.summary_json:
        Path(args.summary_json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.summary_json).write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


def sweep_cleanup_command(args: argparse.Namespace) -> int:
    vertices, _, _ = load_vertices(Path(args.input))
    if not {"x", "y", "z"}.issubset(vertices.dtype.names or ()):
        raise ValueError("PLY vertex schema must contain x/y/z properties")

    z_percentiles = [float(item) for item in args.z_min_percentiles.split(",") if item.strip()]
    scale_percentiles = [float(item) for item in args.max_scale_percentiles.split(",") if item.strip()]
    z_thresholds, z_summary = percentile_values(vertices["z"].astype(np.float64), z_percentiles)
    max_scale = compute_max_scale(vertices)
    if max_scale is None:
        raise ValueError("PLY vertex schema must contain scale_0/1/2 properties")
    scale_thresholds, scale_summary = percentile_values(max_scale, scale_percentiles)

    candidates = []
    for z_p, z_min in zip(z_percentiles, z_thresholds):
        for s_p, scale_max in zip(scale_percentiles, scale_thresholds):
            mask = cleanup_mask(vertices, z_min=float(z_min), max_scale_max=float(scale_max))
            candidate = cleanup_summary(
                vertices,
                mask=mask,
                z_min=float(z_min),
                max_scale_max=float(scale_max),
                z_min_percentile=z_p,
                max_scale_percentile=s_p,
            )
            candidate["id"] = f"zp{z_p}-sp{s_p}"
            candidates.append(candidate)

    candidates.sort(key=lambda item: (item["kept_ratio"], item["percentiles"]["z_min_percentile"], item["percentiles"]["max_scale_percentile"]))  # type: ignore[index]
    payload = {
        "input": args.input,
        "vertex_count": int(vertices.shape[0]),
        "z_percentiles": z_summary,
        "max_scale_percentiles": scale_summary,
        "candidates": candidates,
    }
    output = json.dumps(payload, indent=2, ensure_ascii=False)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output + "\n", encoding="utf-8")
    print(output)
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

    filter_cleanup = subparsers.add_parser(
        "filter-cleanup",
        help="Filter a Gaussian PLY by bottom-z threshold and/or max scale threshold.",
    )
    filter_cleanup.add_argument("input", help="Input PLY file")
    filter_cleanup.add_argument("output", help="Output PLY file")
    filter_cleanup.add_argument("--z-min", type=float)
    filter_cleanup.add_argument("--z-min-percentile", type=float)
    filter_cleanup.add_argument("--max-scale-max", type=float)
    filter_cleanup.add_argument("--max-scale-percentile", type=float)
    filter_cleanup.add_argument("--summary-json", help="Optional JSON summary path")
    filter_cleanup.set_defaults(func=filter_cleanup_command)

    sweep_cleanup = subparsers.add_parser(
        "sweep-cleanup",
        help="Scan cleanup candidates over z-min and max-scale percentiles.",
    )
    sweep_cleanup.add_argument("input", help="Input PLY file")
    sweep_cleanup.add_argument(
        "--z-min-percentiles",
        default="0.1,0.2,0.5,1.0",
        help="Comma-separated lower-z percentiles to test",
    )
    sweep_cleanup.add_argument(
        "--max-scale-percentiles",
        default="99.0,99.5,99.9,99.95,99.99",
        help="Comma-separated upper max-scale percentiles to test",
    )
    sweep_cleanup.add_argument("--output", help="Optional JSON output path")
    sweep_cleanup.set_defaults(func=sweep_cleanup_command)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
