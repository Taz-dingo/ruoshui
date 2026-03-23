#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${ROOT_DIR}/outputs/iteration-001/processed"
STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/scaffoldgs-stage/ruoshui/iteration001"

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [stage_root]" >&2
  exit 1
fi

if [[ $# -eq 1 ]]; then
  STAGE_ROOT="$1"
fi

IMAGES_SRC="${SOURCE_ROOT}/images"
SPARSE_SRC="${SOURCE_ROOT}/colmap/sparse/0"

if [[ ! -d "${IMAGES_SRC}" ]]; then
  echo "Missing images source: ${IMAGES_SRC}" >&2
  exit 1
fi

if [[ ! -d "${SPARSE_SRC}" ]]; then
  echo "Missing COLMAP sparse source: ${SPARSE_SRC}" >&2
  exit 1
fi

mkdir -p "${STAGE_ROOT}/sparse"

ln -sfn "${IMAGES_SRC}" "${STAGE_ROOT}/images"
ln -sfn "${SPARSE_SRC}" "${STAGE_ROOT}/sparse/0"

cat <<EOF
Prepared Scaffold-GS stage:
  scene_root: ${STAGE_ROOT}
  images:     ${STAGE_ROOT}/images -> ${IMAGES_SRC}
  sparse:     ${STAGE_ROOT}/sparse/0 -> ${SPARSE_SRC}

Suggested Scaffold-GS train command:
  bash ./train.sh -d ruoshui/iteration001 -l baseline --gpu 0 --voxel_size 0.001 --update_init_factor 16 --appearance_dim 0 --ratio 1
EOF
