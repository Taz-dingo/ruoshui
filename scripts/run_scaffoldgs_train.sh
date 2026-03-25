#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/scaffoldgs-stage/ruoshui/iteration001"
DEFAULT_DATA_SUBDIR="ruoshui/iteration001"
GPU_ID="0"
LOG_NAME="baseline"
VOXEL_SIZE="0.001"
UPDATE_INIT_FACTOR="16"
APPEARANCE_DIM="0"
RATIO="1"
EXECUTE="0"
CONDA_PREFIX_PATH=""
CUDA_BIN_PATH=""

usage() {
  cat <<EOF
Usage: $0 --scaffold-dir /path/to/Scaffold-GS [options]

Options:
  --scaffold-dir PATH       Scaffold-GS repo root (required)
  --stage-root PATH         Scene root prepared for Scaffold-GS
                            Default: ${DEFAULT_STAGE_ROOT}
  --data-subdir PATH        Subdir under Scaffold-GS/data
                            Default: ${DEFAULT_DATA_SUBDIR}
  --gpu ID                  GPU id passed to train.sh
                            Default: ${GPU_ID}
  --log-name NAME           Experiment log name
                            Default: ${LOG_NAME}
  --voxel-size VALUE        Passed to train.sh
  --update-init-factor N    Passed to train.sh
  --appearance-dim N        Passed to train.sh
  --ratio VALUE             Passed to train.sh
  --conda-prefix PATH       Run train.sh inside this conda env prefix
  --cuda-bin PATH           Prepend this CUDA bin dir to PATH before training
  --execute                 Actually run train.sh. Default is dry-run.
  -h, --help                Show this help
EOF
}

SCAFFOLD_DIR=""
STAGE_ROOT="${DEFAULT_STAGE_ROOT}"
DATA_SUBDIR="${DEFAULT_DATA_SUBDIR}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scaffold-dir)
      SCAFFOLD_DIR="$2"
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
    --voxel-size)
      VOXEL_SIZE="$2"
      shift 2
      ;;
    --update-init-factor)
      UPDATE_INIT_FACTOR="$2"
      shift 2
      ;;
    --appearance-dim)
      APPEARANCE_DIM="$2"
      shift 2
      ;;
    --ratio)
      RATIO="$2"
      shift 2
      ;;
    --conda-prefix)
      CONDA_PREFIX_PATH="$2"
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

if [[ -z "${SCAFFOLD_DIR}" ]]; then
  echo "--scaffold-dir is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -d "${SCAFFOLD_DIR}" ]]; then
  echo "Missing Scaffold-GS directory: ${SCAFFOLD_DIR}" >&2
  exit 1
fi

TRAIN_SH="${SCAFFOLD_DIR}/train.sh"
if [[ ! -f "${TRAIN_SH}" ]]; then
  echo "Missing train.sh in Scaffold-GS dir: ${TRAIN_SH}" >&2
  exit 1
fi

if [[ -n "${CONDA_PREFIX_PATH}" && ! -d "${CONDA_PREFIX_PATH}" ]]; then
  echo "Missing conda prefix: ${CONDA_PREFIX_PATH}" >&2
  exit 1
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

if ! command -v nvcc >/dev/null 2>&1; then
  cat <<EOF >&2
nvcc is not available in PATH.

Suggested fix:
  export PATH=/usr/local/cuda/bin:\$PATH
  export CUDA_HOME=/usr/local/cuda
EOF
  exit 1
fi

if [[ -z "${CONDA_PREFIX_PATH}" ]] && ! command -v ninja >/dev/null 2>&1; then
  cat <<EOF >&2
ninja is not available in PATH.

Suggested fix:
  1. Install ninja into the Scaffold-GS environment
  2. Re-run this script with --conda-prefix /path/to/env
EOF
  exit 1
fi

if [[ ! -d "${STAGE_ROOT}/images" || ! -d "${STAGE_ROOT}/sparse/0" ]]; then
  "${ROOT_DIR}/scripts/prepare_scaffoldgs_stage.sh" "${STAGE_ROOT}"
fi

TARGET_SCENE_ROOT="${SCAFFOLD_DIR}/data/${DATA_SUBDIR}"
mkdir -p "${TARGET_SCENE_ROOT}/sparse"
ln -sfn "${STAGE_ROOT}/images" "${TARGET_SCENE_ROOT}/images"
ln -sfn "${STAGE_ROOT}/sparse/0" "${TARGET_SCENE_ROOT}/sparse/0"

CMD=(
  bash ./train.sh
  -d "${DATA_SUBDIR}"
  -l "${LOG_NAME}"
  --gpu "${GPU_ID}"
  --voxel_size "${VOXEL_SIZE}"
  --update_init_factor "${UPDATE_INIT_FACTOR}"
  --appearance_dim "${APPEARANCE_DIM}"
  --ratio "${RATIO}"
)

cat <<EOF
Prepared Scaffold-GS train linkage:
  scaffold_dir: ${SCAFFOLD_DIR}
  stage_root:   ${STAGE_ROOT}
  scene_root:   ${TARGET_SCENE_ROOT}
  images:       ${TARGET_SCENE_ROOT}/images -> ${STAGE_ROOT}/images
  sparse:       ${TARGET_SCENE_ROOT}/sparse/0 -> ${STAGE_ROOT}/sparse/0

Training command:
  (cd ${SCAFFOLD_DIR} && ${CMD[*]})
Environment summary:
  conda_prefix: ${CONDA_PREFIX_PATH:-<none>}
  cuda_bin:     ${CUDA_BIN_PATH:-$(dirname "$(command -v nvcc)")}
  nvcc:         $(command -v nvcc)
  ninja:        $(command -v ninja || echo "<missing in current shell>")
EOF

if [[ "${EXECUTE}" == "1" ]]; then
  if [[ -n "${CONDA_PREFIX_PATH}" ]]; then
    (
      cd "${SCAFFOLD_DIR}"
      conda run -p "${CONDA_PREFIX_PATH}" env PATH="${PATH}" CUDA_HOME="${CUDA_HOME:-}" "${CMD[@]}"
    )
  else
    (
      cd "${SCAFFOLD_DIR}"
      "${CMD[@]}"
    )
  fi
fi
