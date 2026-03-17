from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / 'assets' / 'raw'
OUTPUT_JSON = ROOT / 'data' / 'asset_inventory.json'
OUTPUT_MD = ROOT / 'docs' / 'assets' / 'asset-inventory.md'

JPEG_SOFS = {
    0xC0, 0xC1, 0xC2, 0xC3,
    0xC5, 0xC6, 0xC7,
    0xC9, 0xCA, 0xCB,
    0xCD, 0xCE, 0xCF,
}
IMAGE_INDEX_RE = re.compile(r'(?P<prefix>.+?)(?P<index>\d+)(?P<suffix>\.[^.]+)$', re.IGNORECASE)


@dataclass
class FileInfo:
    path: str
    directory: str
    name: str
    size_bytes: int
    modified_at: str
    extension: str
    width: int | None
    height: int | None
    image_type: str | None
    sequence_index: int | None



def format_bytes(num: int) -> str:
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    value = float(num)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            if unit == 'B':
                return f'{int(value)} {unit}'
            return f'{value:.2f} {unit}'
        value /= 1024
    return f'{num} B'



def read_png_size(handle) -> tuple[int, int] | tuple[None, None]:
    handle.seek(16)
    chunk = handle.read(8)
    if len(chunk) != 8:
        return None, None
    width = int.from_bytes(chunk[:4], 'big')
    height = int.from_bytes(chunk[4:], 'big')
    return width, height



def read_jpeg_size(handle) -> tuple[int, int] | tuple[None, None]:
    handle.seek(0)
    if handle.read(2) != b'\xff\xd8':
        return None, None

    while True:
        marker_prefix = handle.read(1)
        if not marker_prefix:
            return None, None
        if marker_prefix != b'\xff':
            continue

        marker = handle.read(1)
        while marker == b'\xff':
            marker = handle.read(1)
        if not marker:
            return None, None

        marker_value = marker[0]
        if marker_value in {0xD8, 0xD9}:
            continue
        if marker_value == 0xDA:
            return None, None

        segment_length_raw = handle.read(2)
        if len(segment_length_raw) != 2:
            return None, None
        segment_length = int.from_bytes(segment_length_raw, 'big')
        if segment_length < 2:
            return None, None

        if marker_value in JPEG_SOFS:
            precision = handle.read(1)
            dims = handle.read(4)
            if len(precision) != 1 or len(dims) != 4:
                return None, None
            height = int.from_bytes(dims[:2], 'big')
            width = int.from_bytes(dims[2:], 'big')
            return width, height

        handle.seek(segment_length - 2, 1)



def detect_dimensions(path: Path) -> tuple[str | None, int | None, int | None]:
    try:
        with path.open('rb') as handle:
            signature = handle.read(8)
            handle.seek(0)
            if signature.startswith(b'\x89PNG\r\n\x1a\n'):
                width, height = read_png_size(handle)
                return 'png', width, height
            if signature.startswith(b'\xff\xd8'):
                width, height = read_jpeg_size(handle)
                return 'jpeg', width, height
    except OSError:
        return None, None, None
    return None, None, None



def sha1(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()



def collect_files() -> list[FileInfo]:
    files: list[FileInfo] = []
    for path in sorted(p for p in RAW_DIR.rglob('*') if p.is_file()):
        stat = path.stat()
        relative_path = path.relative_to(ROOT).as_posix()
        relative_dir = path.parent.relative_to(ROOT).as_posix()
        image_type, width, height = detect_dimensions(path)
        match = IMAGE_INDEX_RE.match(path.name)
        files.append(
            FileInfo(
                path=relative_path,
                directory=relative_dir,
                name=path.name,
                size_bytes=stat.st_size,
                modified_at=datetime.fromtimestamp(stat.st_mtime).astimezone().isoformat(timespec='seconds'),
                extension=path.suffix.lower(),
                width=width,
                height=height,
                image_type=image_type,
                sequence_index=int(match.group('index')) if match else None,
            )
        )
    return files



def summarize_directories(files: Iterable[FileInfo]) -> list[dict]:
    grouped: dict[str, list[FileInfo]] = defaultdict(list)
    for file in files:
        grouped[file.directory].append(file)

    summaries: list[dict] = []
    for directory, group in sorted(grouped.items()):
        indices = [f.sequence_index for f in group if f.sequence_index is not None]
        resolutions = Counter((f.width, f.height) for f in group if f.width and f.height)
        summaries.append(
            {
                'directory': directory,
                'file_count': len(group),
                'total_size_bytes': sum(f.size_bytes for f in group),
                'first_file': min((f.name for f in group), default=None),
                'last_file': max((f.name for f in group), default=None),
                'sequence_min': min(indices) if indices else None,
                'sequence_max': max(indices) if indices else None,
                'top_resolutions': [
                    {'resolution': f'{width}x{height}', 'count': count}
                    for (width, height), count in resolutions.most_common(3)
                ],
            }
        )
    return summaries



def summarize_duplicates(files: Iterable[FileInfo]) -> list[dict]:
    by_name: dict[str, list[FileInfo]] = defaultdict(list)
    for file in files:
        by_name[file.name].append(file)

    duplicate_sets: list[dict] = []
    for name, group in sorted(by_name.items()):
        if len(group) < 2:
            continue
        hashes = []
        for item in group:
            item_path = ROOT / item.path
            hashes.append({'path': item.path, 'sha1': sha1(item_path)})
        duplicate_sets.append(
            {
                'name': name,
                'count': len(group),
                'paths': [item.path for item in group],
                'same_content': len({entry['sha1'] for entry in hashes}) == 1,
                'hashes': hashes,
            }
        )
    return duplicate_sets



def build_markdown(report: dict) -> str:
    lines: list[str] = []
    lines.append('# 素材盘点报告')
    lines.append('')
    lines.append(f"生成时间：`{report['generated_at']}`")
    lines.append('')
    lines.append('## 盘点范围')
    lines.append('')
    lines.append(f"- 素材目录：`{report['raw_dir']}`")
    lines.append('- 当前仅做基础盘点，不对五向朝向做自动分类')
    lines.append('- 当前唯一可靠标识是文件路径，不是文件名')
    lines.append('')
    lines.append('## 总览')
    lines.append('')
    summary = report['summary']
    lines.append(f"- 文件总数：`{summary['file_count']}`")
    lines.append(f"- 目录总数：`{summary['directory_count']}`")
    lines.append(f"- 总体积：`{summary['total_size_human']}`")
    lines.append(f"- 分辨率类型数：`{summary['resolution_group_count']}`")
    lines.append(f"- 重名文件组数：`{summary['duplicate_name_group_count']}`")
    lines.append('')
    lines.append('## 目录分布')
    lines.append('')
    for directory in report['directories']:
        lines.append(
            f"- `{directory['directory']}`：`{directory['file_count']}` 张，约 `{format_bytes(directory['total_size_bytes'])}`，"
            f"序号范围 `{directory['sequence_min']}` - `{directory['sequence_max']}`"
        )
    lines.append('')
    lines.append('## 分辨率分布')
    lines.append('')
    for item in report['resolution_groups'][:10]:
        lines.append(f"- `{item['resolution']}`：`{item['count']}` 张")
    lines.append('')
    lines.append('## 重名情况')
    lines.append('')
    if report['duplicate_name_groups']:
        lines.append('- 检测到跨目录重名文件，说明文件名不能作为素材主键')
        for item in report['duplicate_name_groups'][:10]:
            status = '内容相同' if item['same_content'] else '内容不同'
            lines.append(f"- `{item['name']}`：`{item['count']}` 个路径，`{status}`")
    else:
        lines.append('- 未发现重名文件')
    lines.append('')
    lines.append('## 初步判断')
    lines.append('')
    lines.append('- 当前素材量足够支撑第一轮空中版 `3DGS` 可行性验证')
    lines.append('- 在未整理五向朝向之前，不建议直接全量训练；建议先选一个较小批次做 `PoC`')
    lines.append('- 由于存在重名文件，后续任何脚本和数据表都必须使用相对路径作为主标识')
    lines.append('- 第一轮 `PoC` 建议优先选择较小目录或其中一段连续序列，以便更快暴露素材与训练链路风险')
    lines.append('')
    lines.append('## 建议的下一步')
    lines.append('')
    lines.append('- 基于本报告补一份人工素材备注：每个目录大致拍摄区域、时间、飞行高度、是否完整覆盖')
    lines.append('- 选定首个 `PoC` 子集并记录筛选规则')
    lines.append('- 开始准备第一轮 `3DGS` 实验记录')
    lines.append('')
    return '\n'.join(lines)



def main() -> None:
    if not RAW_DIR.exists():
        raise SystemExit(f'Raw asset directory not found: {RAW_DIR}')

    files = collect_files()
    resolution_counter = Counter(
        f'{file.width}x{file.height}'
        for file in files
        if file.width is not None and file.height is not None
    )
    duplicate_name_groups = summarize_duplicates(files)
    directories = summarize_directories(files)

    report = {
        'generated_at': datetime.now().astimezone().isoformat(timespec='seconds'),
        'raw_dir': RAW_DIR.relative_to(ROOT).as_posix(),
        'summary': {
            'file_count': len(files),
            'directory_count': len({file.directory for file in files}),
            'total_size_bytes': sum(file.size_bytes for file in files),
            'total_size_human': format_bytes(sum(file.size_bytes for file in files)),
            'resolution_group_count': len(resolution_counter),
            'duplicate_name_group_count': len(duplicate_name_groups),
        },
        'directories': directories,
        'resolution_groups': [
            {'resolution': resolution, 'count': count}
            for resolution, count in resolution_counter.most_common()
        ],
        'duplicate_name_groups': duplicate_name_groups,
        'files': [asdict(file) for file in files],
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    OUTPUT_MD.write_text(build_markdown(report), encoding='utf-8')

    print(f'Wrote {OUTPUT_JSON.relative_to(ROOT)}')
    print(f'Wrote {OUTPUT_MD.relative_to(ROOT)}')
    print(json.dumps(report['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
