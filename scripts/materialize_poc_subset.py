from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / 'data' / 'poc-001-files.txt'
DEFAULT_OUTPUT = ROOT / 'assets' / 'staging' / 'poc-001' / 'images'
DEFAULT_MANIFEST = ROOT / 'assets' / 'staging' / 'poc-001' / 'manifest.json'


def main() -> None:
    parser = argparse.ArgumentParser(description='Materialize a PoC subset into a unique-name staging directory.')
    parser.add_argument('--input-list', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument('--mode', choices=['symlink', 'copy'], default='symlink')
    parser.add_argument('--prefix', default='poc001')
    args = parser.parse_args()

    input_list = args.input_list if args.input_list.is_absolute() else ROOT / args.input_list
    output_dir = args.output_dir if args.output_dir.is_absolute() else ROOT / args.output_dir
    manifest_path = args.manifest if args.manifest.is_absolute() else ROOT / args.manifest

    paths = [line.strip() for line in input_list.read_text(encoding='utf-8').splitlines() if line.strip()]
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, str]] = []
    for index, relative_path in enumerate(paths, start=1):
        source = ROOT / relative_path
        suffix = source.suffix.lower()
        staged_name = f'{args.prefix}_{index:04d}{suffix}'
        target = output_dir / staged_name

        if target.exists() or target.is_symlink():
            target.unlink()

        if args.mode == 'symlink':
            target.symlink_to(source.resolve())
        else:
            shutil.copy2(source, target)

        manifest.append(
            {
                'index': index,
                'source_path': relative_path,
                'staged_path': target.relative_to(ROOT).as_posix(),
                'staged_name': staged_name,
                'mode': args.mode,
            }
        )

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f'Materialized {len(manifest)} files')
    print(f'Output dir: {output_dir.relative_to(ROOT)}')
    print(f'Manifest: {manifest_path.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
