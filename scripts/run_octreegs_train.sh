#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/octreegs-stage-undistorted/ruoshui/iteration001"
DEFAULT_SOURCE_ROOT="${ROOT_DIR}/outputs/iteration-003/scaffoldgs-undistorted"
DEFAULT_DATA_SUBDIR="ruoshui/iteration001"
GPU_ID="0"
LOG_NAME="baseline"
RESOLUTION="-1"
RATIO="1"
APPEARANCE_DIM="0"
FORK="2"
BASE_LAYER="12"
VISIBLE_THRESHOLD="0.9"
DIST2LEVEL="round"
UPDATE_RATIO="0.2"
PROGRESSIVE="True"
DIST_RATIO="0.999"
LEVELS="-1"
INIT_LEVEL="-1"
EXTRA_RATIO="0.25"
EXTRA_UP="0.01"
ITERATIONS=""
EXECUTE="0"
ENV_BIN_PATH=""
CUDA_BIN_PATH=""

usage() {
  cat <<EOF
Usage: $0 --octree-dir /path/to/Octree-GS [options]

Options:
  --octree-dir PATH         Octree-GS repo root (required)
  --source-root PATH        Undistorted scene root used to prepare staging
                            Default: ${DEFAULT_SOURCE_ROOT}
  --stage-root PATH         Scene root prepared for Octree-GS
                            Default: ${DEFAULT_STAGE_ROOT}
  --data-subdir PATH        Subdir under Octree-GS/data
                            Default: ${DEFAULT_DATA_SUBDIR}
  --gpu ID                  GPU id passed to train.sh
                            Default: ${GPU_ID}
  --log-name NAME           Experiment log name
                            Default: ${LOG_NAME}
  --resolution VALUE        Passed to train.sh
                            Default: ${RESOLUTION}
  --ratio VALUE             Passed to train.sh
  --appearance-dim N        Passed to train.sh
  --fork N                  Passed to train.sh
  --base-layer N            Passed to train.sh
  --visible-threshold V     Passed to train.sh
  --dist2level MODE         Passed to train.sh
  --update-ratio V          Passed to train.sh
  --progressive BOOL        Passed to train.sh
  --dist-ratio V            Passed to train.sh
  --levels N                Passed to train.sh
  --init-level N            Passed to train.sh
  --extra-ratio V           Passed to train.sh
  --extra-up V              Passed to train.sh
  --iterations N            Override Octree-GS train iterations
  --env-bin PATH            Prepend this env bin dir to PATH before training
  --cuda-bin PATH           Prepend this CUDA bin dir to PATH before training
  --execute                 Actually run train.sh. Default is dry-run.
  -h, --help                Show this help
EOF
}

OCTREE_DIR=""
SOURCE_ROOT="${DEFAULT_SOURCE_ROOT}"
STAGE_ROOT="${DEFAULT_STAGE_ROOT}"
DATA_SUBDIR="${DEFAULT_DATA_SUBDIR}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --octree-dir)
      OCTREE_DIR="$2"
      shift 2
      ;;
    --source-root)
      SOURCE_ROOT="$2"
      shift 2
      ;;
    --stage-root)
      STAGE_ROOT="$2"
      shift 2
      ;;
    --data-subdir)
      DATA_SUBDIR="$2"
      shift 2
      ;;
    --gpu)
      GPU_ID="$2"
      shift 2
      ;;
    --log-name)
      LOG_NAME="$2"
      shift 2
      ;;
    --resolution)
      RESOLUTION="$2"
      shift 2
      ;;
    --ratio)
      RATIO="$2"
      shift 2
      ;;
    --appearance-dim)
      APPEARANCE_DIM="$2"
      shift 2
      ;;
    --fork)
      FORK="$2"
      shift 2
      ;;
    --base-layer)
      BASE_LAYER="$2"
      shift 2
      ;;
    --visible-threshold)
      VISIBLE_THRESHOLD="$2"
      shift 2
      ;;
    --dist2level)
      DIST2LEVEL="$2"
      shift 2
      ;;
    --update-ratio)
      UPDATE_RATIO="$2"
      shift 2
      ;;
    --progressive)
      PROGRESSIVE="$2"
      shift 2
      ;;
    --dist-ratio)
      DIST_RATIO="$2"
      shift 2
      ;;
    --levels)
      LEVELS="$2"
      shift 2
      ;;
    --init-level)
      INIT_LEVEL="$2"
      shift 2
      ;;
    --extra-ratio)
      EXTRA_RATIO="$2"
      shift 2
      ;;
    --extra-up)
      EXTRA_UP="$2"
      shift 2
      ;;
    --iterations)
      ITERATIONS="$2"
      shift 2
      ;;
    --env-bin)
      ENV_BIN_PATH="$2"
      shift 2
      ;;
    --cuda-bin)
      CUDA_BIN_PATH="$2"
      shift 2
      ;;
    --execute)
      EXECUTE="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${OCTREE_DIR}" ]]; then
  echo "--octree-dir is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -d "${OCTREE_DIR}" ]]; then
  echo "Missing Octree-GS directory: ${OCTREE_DIR}" >&2
  exit 1
fi

TRAIN_SH="${OCTREE_DIR}/train.sh"
if [[ ! -f "${TRAIN_SH}" ]]; then
  echo "Missing train.sh in Octree-GS dir: ${TRAIN_SH}" >&2
  exit 1
fi

if [[ -n "${ENV_BIN_PATH}" ]]; then
  if [[ ! -d "${ENV_BIN_PATH}" ]]; then
    echo "Missing env bin dir: ${ENV_BIN_PATH}" >&2
    exit 1
  fi
  export PATH="${ENV_BIN_PATH}:${PATH}"
fi

if [[ -n "${CUDA_BIN_PATH}" ]]; then
  if [[ ! -d "${CUDA_BIN_PATH}" ]]; then
    echo "Missing CUDA bin dir: ${CUDA_BIN_PATH}" >&2
    exit 1
  fi
  export PATH="${CUDA_BIN_PATH}:${PATH}"
elif ! command -v nvcc >/dev/null 2>&1; then
  for candidate in /usr/local/cuda/bin /usr/local/cuda-12.8/bin; do
    if [[ -x "${candidate}/nvcc" ]]; then
      export PATH="${candidate}:${PATH}"
      CUDA_BIN_PATH="${candidate}"
      break
    fi
  done
fi

if [[ -n "${CUDA_BIN_PATH}" ]]; then
  export CUDA_HOME="$(cd "${CUDA_BIN_PATH}/.." && pwd)"
fi

if ! command -v python >/dev/null 2>&1; then
  echo "python is not available in PATH" >&2
  exit 1
fi

if ! command -v nvcc >/dev/null 2>&1; then
  cat <<EOF >&2
nvcc is not available in PATH.

Suggested fix:
  export PATH=/usr/local/cuda/bin:\$PATH
  export CUDA_HOME=/usr/local/cuda
EOF
  exit 1
fi

if ! command -v ninja >/dev/null 2>&1; then
  cat <<EOF >&2
ninja is not available in PATH.

Suggested fix:
  export PATH=/root/autodl-tmp/ruoshui/.venv-iteration001/bin:\$PATH
  python -m pip install ninja
EOF
  exit 1
fi

if [[ ! -d "${STAGE_ROOT}/images" || ! -d "${STAGE_ROOT}/sparse/0" ]]; then
  "${ROOT_DIR}/scripts/prepare_octreegs_stage.sh" "${SOURCE_ROOT}" "${STAGE_ROOT}"
fi

TARGET_SCENE_ROOT="${OCTREE_DIR}/data/${DATA_SUBDIR}"
mkdir -p "${TARGET_SCENE_ROOT}"
if [[ -L "${TARGET_SCENE_ROOT}/sparse" ]]; then
  rm -f "${TARGET_SCENE_ROOT}/sparse"
fi
mkdir -p "${TARGET_SCENE_ROOT}/sparse"
ln -sfn "${STAGE_ROOT}/images" "${TARGET_SCENE_ROOT}/images"
ln -sfn "${STAGE_ROOT}/sparse/0" "${TARGET_SCENE_ROOT}/sparse/0"

CMD=(
  bash ./train.sh
  -d "${DATA_SUBDIR}"
  -l "${LOG_NAME}"
  --gpu "${GPU_ID}"
  -r "${RESOLUTION}"
  --ratio "${RATIO}"
  --appearance_dim "${APPEARANCE_DIM}"
  --fork "${FORK}"
  --base_layer "${BASE_LAYER}"
  --visible_threshold "${VISIBLE_THRESHOLD}"
  --dist2level "${DIST2LEVEL}"
  --update_ratio "${UPDATE_RATIO}"
  --progressive "${PROGRESSIVE}"
  --dist_ratio "${DIST_RATIO}"
  --levels "${LEVELS}"
  --init_level "${INIT_LEVEL}"
  --extra_ratio "${EXTRA_RATIO}"
  --extra_up "${EXTRA_UP}"
)

if [[ -n "${ITERATIONS}" ]]; then
  CMD+=(--iterations "${ITERATIONS}")
fi

cat <<EOF
Prepared Octree-GS train linkage:
  octree_dir:  ${OCTREE_DIR}
  source_root: ${SOURCE_ROOT}
  stage_root:  ${STAGE_ROOT}
  scene_root:  ${TARGET_SCENE_ROOT}
  images:      ${TARGET_SCENE_ROOT}/images -> ${STAGE_ROOT}/images
  sparse:      ${TARGET_SCENE_ROOT}/sparse/0 -> ${STAGE_ROOT}/sparse/0

Training command:
  (cd ${OCTREE_DIR} && ${CMD[*]})
Environment summary:
  env_bin:     ${ENV_BIN_PATH:-<none>}
  python:      $(command -v python)
  cuda_bin:    ${CUDA_BIN_PATH:-$(dirname "$(command -v nvcc)")}
  nvcc:        $(command -v nvcc)
  ninja:       $(command -v ninja)
EOF

if [[ "${EXECUTE}" == "1" ]]; then
  (
    cd "${OCTREE_DIR}"
    "${CMD[@]}"
  )
fi
