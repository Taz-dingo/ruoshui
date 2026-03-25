#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${ROOT_DIR}/outputs/iteration-003/scaffoldgs-undistorted"
STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/citygaussian-v1-stage/ruoshui/iteration001"

if [[ $# -gt 2 ]]; then
  echo "Usage: $0 [source_root] [stage_root]" >&2
  exit 1
fi

if [[ $# -ge 1 ]]; then
  SOURCE_ROOT="$1"
fi

if [[ $# -eq 2 ]]; then
  STAGE_ROOT="$2"
fi

IMAGES_SRC="${SOURCE_ROOT}/images"
SPARSE_SRC="${SOURCE_ROOT}/sparse"

if [[ ! -d "${IMAGES_SRC}" ]]; then
  echo "Missing images source: ${IMAGES_SRC}" >&2
  exit 1
fi

if [[ ! -d "${SPARSE_SRC}" ]]; then
  echo "Missing sparse source: ${SPARSE_SRC}" >&2
  exit 1
fi

mkdir -p "${STAGE_ROOT}/train/sparse" "${STAGE_ROOT}/test/sparse"

ln -sfn "${IMAGES_SRC}" "${STAGE_ROOT}/train/images"
ln -sfn "${SPARSE_SRC}" "${STAGE_ROOT}/train/sparse/0"
ln -sfn "${IMAGES_SRC}" "${STAGE_ROOT}/test/images"
ln -sfn "${SPARSE_SRC}" "${STAGE_ROOT}/test/sparse/0"

cat <<EOF
Prepared CityGaussian V1 stage:
  scene_root:    ${STAGE_ROOT}
  train/images:  ${STAGE_ROOT}/train/images -> ${IMAGES_SRC}
  train/sparse:  ${STAGE_ROOT}/train/sparse/0 -> ${SPARSE_SRC}
  test/images:   ${STAGE_ROOT}/test/images -> ${IMAGES_SRC}
  test/sparse:   ${STAGE_ROOT}/test/sparse/0 -> ${SPARSE_SRC}

Notes:
  - This is a minimal dry-run staging layout for CityGaussian V1-original.
  - train/test currently point to the same undistorted scene to keep the entry cost low.
  - Before a real baseline run, verify whether V1's custom dataset flow expects a stricter split.
  - Coarse config should point source_path at: data/ruoshui/iteration001/train
  - Partition config should reuse the same source_path and set pretrain_path to the coarse output.
EOF
