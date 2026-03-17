from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY = ROOT / 'data' / 'asset_inventory.json'
DEFAULT_OUTPUT = ROOT / 'data' / 'poc-001-files.txt'


def evenly_spaced_indices(total: int, sample_size: int) -> list[int]:
    if sample_size <= 0 or total <= 0:
        return []
    if sample_size >= total:
        return list(range(total))
    return sorted({round(i * (total - 1) / (sample_size - 1)) for i in range(sample_size)})


def main() -> None:
    parser = argparse.ArgumentParser(description='Create a stratified uniform sample from asset inventory.')
    parser.add_argument('--sample-size', type=int, default=180)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    report = json.loads(INVENTORY.read_text(encoding='utf-8'))
    files = report['files']

    grouped: dict[str, list[dict]] = {}
    for item in files:
        grouped.setdefault(item['directory'], []).append(item)

    for directory in grouped:
        grouped[directory] = sorted(
            grouped[directory],
            key=lambda item: (
                item['sequence_index'] is None,
                item['sequence_index'] if item['sequence_index'] is not None else item['name'],
                item['path'],
            ),
        )

    total_files = sum(len(group) for group in grouped.values())
    allocations: dict[str, int] = {}
    remainders: list[tuple[float, str]] = []
    assigned = 0
    for directory, group in grouped.items():
        exact = args.sample_size * len(group) / total_files
        base = int(exact)
        allocations[directory] = base
        assigned += base
        remainders.append((exact - base, directory))

    for _, directory in sorted(remainders, reverse=True)[: args.sample_size - assigned]:
        allocations[directory] += 1

    selected_paths: list[str] = []
    summary: list[tuple[str, int, int]] = []
    for directory in sorted(grouped):
        group = grouped[directory]
        count = allocations[directory]
        indices = evenly_spaced_indices(len(group), count)
        selection = [group[index]['path'] for index in indices]
        selected_paths.extend(selection)
        summary.append((directory, len(group), len(selection)))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('\n'.join(selected_paths) + '\n', encoding='utf-8')

    print(f'Wrote {args.output.relative_to(ROOT)}')
    print(f'Selected {len(selected_paths)} files')
    for directory, total, picked in summary:
        print(f'- {directory}: picked {picked} / {total}')


if __name__ == '__main__':
    main()
