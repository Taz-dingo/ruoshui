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
EOF

if [[ "${EXECUTE}" == "1" ]]; then
  (
    cd "${SCAFFOLD_DIR}"
    "${CMD[@]}"
  )
fi
