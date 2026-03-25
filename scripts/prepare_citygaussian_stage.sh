#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${ROOT_DIR}/outputs/iteration-003/scaffoldgs-undistorted"
STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/citygaussian-stage/ruoshui/iteration001"

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

mkdir -p "${STAGE_ROOT}/sparse"

ln -sfn "${IMAGES_SRC}" "${STAGE_ROOT}/images"
ln -sfn "${SPARSE_SRC}" "${STAGE_ROOT}/sparse/0"

cat <<EOF
Prepared CityGaussian stage:
  scene_root: ${STAGE_ROOT}
  images:     ${STAGE_ROOT}/images -> ${IMAGES_SRC}
  sparse:     ${STAGE_ROOT}/sparse/0 -> ${SPARSE_SRC}

Next CityGaussian-specific steps still required:
  1. Choose repo branch: main or V1-original
  2. Generate downsampled images as required by the chosen branch workflow
  3. Generate Depth Anything V2 depth priors if following the main branch pipeline
  4. Map this scene root into CityGaussian's data/<scene> layout before training
EOF
