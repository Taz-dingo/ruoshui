#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_STAGE_ROOT="${ROOT_DIR}/outputs/iteration-003/citygaussian-v1-stage/ruoshui/iteration001"
DEFAULT_DATA_SUBDIR="ruoshui/iteration001"
DEFAULT_COARSE_CONFIG="ruoshui_iteration001_coarse"
DEFAULT_CONFIG="ruoshui_iteration001_c1_r1"
DEFAULT_TEST_PATH="data/${DEFAULT_DATA_SUBDIR}/test"
DEFAULT_OUT_NAME="test"
DEFAULT_MAX_BLOCK_ID="0"
DEFAULT_START_PORT="4041"
EXECUTE="0"

usage() {
  cat <<EOF
Usage: $0 --citygs-dir /path/to/CityGaussian [options]

Options:
  --citygs-dir PATH         CityGaussian repo root (required)
  --stage-root PATH         Prepared V1 stage root with train/test subdirs
                            Default: ${DEFAULT_STAGE_ROOT}
  --data-subdir PATH        Subdir under CityGaussian/data
                            Default: ${DEFAULT_DATA_SUBDIR}
  --coarse-config NAME      Config basename for coarse stage
                            Default: ${DEFAULT_COARSE_CONFIG}
  --config NAME             Config basename for partition/finetune stage
                            Default: ${DEFAULT_CONFIG}
  --test-path PATH          Path passed to render_large.py --custom_test
                            Default: ${DEFAULT_TEST_PATH}
  --out-name NAME           Output name passed to metrics_large.py -t
                            Default: ${DEFAULT_OUT_NAME}
  --max-block-id N          Highest block id used in the finetune loop
                            Default: ${DEFAULT_MAX_BLOCK_ID}
  --start-port N            Initial port passed to per-block training jobs
                            Default: ${DEFAULT_START_PORT}
  --execute                 Actually run the official command sequence
                            Default is dry-run.
  -h, --help                Show this help
EOF
}

CITYGS_DIR=""
STAGE_ROOT="${DEFAULT_STAGE_ROOT}"
DATA_SUBDIR="${DEFAULT_DATA_SUBDIR}"
COARSE_CONFIG="${DEFAULT_COARSE_CONFIG}"
CONFIG_NAME="${DEFAULT_CONFIG}"
TEST_PATH="${DEFAULT_TEST_PATH}"
OUT_NAME="${DEFAULT_OUT_NAME}"
MAX_BLOCK_ID="${DEFAULT_MAX_BLOCK_ID}"
START_PORT="${DEFAULT_START_PORT}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --citygs-dir)
      CITYGS_DIR="$2"
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
    --coarse-config)
      COARSE_CONFIG="$2"
      shift 2
      ;;
    --config)
      CONFIG_NAME="$2"
      shift 2
      ;;
    --test-path)
      TEST_PATH="$2"
      shift 2
      ;;
    --out-name)
      OUT_NAME="$2"
      shift 2
      ;;
    --max-block-id)
      MAX_BLOCK_ID="$2"
      shift 2
      ;;
    --start-port)
      START_PORT="$2"
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

if [[ -z "${CITYGS_DIR}" ]]; then
  echo "--citygs-dir is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -d "${CITYGS_DIR}" ]]; then
  echo "Missing CityGaussian directory: ${CITYGS_DIR}" >&2
  exit 1
fi

if [[ ! -d "${STAGE_ROOT}/train/images" || ! -d "${STAGE_ROOT}/train/sparse/0" || ! -d "${STAGE_ROOT}/test/images" || ! -d "${STAGE_ROOT}/test/sparse/0" ]]; then
  "${ROOT_DIR}/scripts/prepare_citygaussian_v1_stage.sh" "${ROOT_DIR}/outputs/iteration-003/scaffoldgs-undistorted" "${STAGE_ROOT}"
fi

TARGET_SCENE_ROOT="${CITYGS_DIR}/data/${DATA_SUBDIR}"
mkdir -p "${TARGET_SCENE_ROOT}"
ln -sfn "${STAGE_ROOT}/train" "${TARGET_SCENE_ROOT}/train"
ln -sfn "${STAGE_ROOT}/test" "${TARGET_SCENE_ROOT}/test"

cat <<EOF
Prepared CityGaussian V1 linkage:
  citygs_dir:      ${CITYGS_DIR}
  stage_root:      ${STAGE_ROOT}
  scene_root:      ${TARGET_SCENE_ROOT}
  train:           ${TARGET_SCENE_ROOT}/train -> ${STAGE_ROOT}/train
  test:            ${TARGET_SCENE_ROOT}/test -> ${STAGE_ROOT}/test

Official V1 command order for Ruoshui:
  1. python train_large.py --config config/${COARSE_CONFIG}.yaml
  2. python data_partition.py --config config/${CONFIG_NAME}.yaml
  3. for block_id in 0..${MAX_BLOCK_ID}: python train_large.py --config config/${CONFIG_NAME}.yaml --block_id <id> --port <port>
  4. python merge.py --config config/${CONFIG_NAME}.yaml
  5. python render_large.py --config config/${CONFIG_NAME}.yaml --custom_test ${TEST_PATH}
  6. python metrics_large.py -m output/${CONFIG_NAME} -t ${OUT_NAME}

Required config mapping before execute:
  coarse source_path:   data/${DATA_SUBDIR}/train
  coarse model_path:    output/${COARSE_CONFIG}
  finetune source_path: data/${DATA_SUBDIR}/train
  partition_name:       ${CONFIG_NAME}
  pretrain_path:        output/${COARSE_CONFIG}/point_cloud/iteration_30000
  test path:            ${TEST_PATH}
  max_block_id:         ${MAX_BLOCK_ID}

Notes:
  - This script only fixes data linkage and the official execution order.
  - It does not invent block_dim, aabb, or ssim_threshold for you.
  - Keep dry-run until config/${COARSE_CONFIG}.yaml and config/${CONFIG_NAME}.yaml are created in CityGaussian.
EOF

if [[ "${EXECUTE}" == "1" ]]; then
  if [[ ! -f "${CITYGS_DIR}/config/${COARSE_CONFIG}.yaml" ]]; then
    echo "Missing coarse config: ${CITYGS_DIR}/config/${COARSE_CONFIG}.yaml" >&2
    exit 1
  fi
  if [[ ! -f "${CITYGS_DIR}/config/${CONFIG_NAME}.yaml" ]]; then
    echo "Missing finetune config: ${CITYGS_DIR}/config/${CONFIG_NAME}.yaml" >&2
    exit 1
  fi
  for required in train_large.py data_partition.py merge.py render_large.py metrics_large.py; do
    if [[ ! -f "${CITYGS_DIR}/${required}" ]]; then
      echo "Missing CityGaussian V1 script: ${CITYGS_DIR}/${required}" >&2
      exit 1
    fi
  done

  (
    cd "${CITYGS_DIR}"
    python train_large.py --config "config/${COARSE_CONFIG}.yaml"
    python data_partition.py --config "config/${CONFIG_NAME}.yaml"

    port="${START_PORT}"
    for block_id in $(seq 0 "${MAX_BLOCK_ID}"); do
      python train_large.py --config "config/${CONFIG_NAME}.yaml" --block_id "${block_id}" --port "${port}"
      port=$((port + 1))
    done

    python merge.py --config "config/${CONFIG_NAME}.yaml"
    python render_large.py --config "config/${CONFIG_NAME}.yaml" --custom_test "${TEST_PATH}"
    python metrics_large.py -m "output/${CONFIG_NAME}" -t "${OUT_NAME}"
  )
fi
