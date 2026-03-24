#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${ROOT_DIR}/outputs/iteration-003/scaffoldgs-undistorted"
STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/octreegs-stage-undistorted/ruoshui/iteration001"

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

mkdir -p "${STAGE_ROOT}"
if [[ -L "${STAGE_ROOT}/sparse" ]]; then
  rm -f "${STAGE_ROOT}/sparse"
fi
mkdir -p "${STAGE_ROOT}/sparse"

ln -sfn "${IMAGES_SRC}" "${STAGE_ROOT}/images"
ln -sfn "${SPARSE_SRC}" "${STAGE_ROOT}/sparse/0"

cat <<EOF
Prepared Octree-GS stage:
  scene_root: ${STAGE_ROOT}
  images:     ${STAGE_ROOT}/images -> ${IMAGES_SRC}
  sparse:     ${STAGE_ROOT}/sparse/0 -> ${SPARSE_SRC}

Suggested Octree-GS train command:
  bash ./train.sh -d ruoshui/iteration001 -l baseline --gpu 0 -r -1 --ratio 1 --appearance_dim 0 --fork 2 --base_layer 12 --visible_threshold 0.9 --dist2level round --update_ratio 0.2 --progressive True --dist_ratio 0.999 --levels -1 --init_level -1 --extra_ratio 0.25 --extra_up 0.01
EOF
