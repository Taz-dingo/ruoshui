#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="${ROOT_DIR}/experiments/citygaussian-v1-src-20260325"
ARCHIVE_PATH="/tmp/citygaussian-v1-complete-20260325.tar.gz"
URL="https://codeload.github.com/Linketic/CityGaussian/tar.gz/refs/heads/V1-original"

usage() {
  cat <<EOF
Usage: $0 [dest_dir]

Downloads and extracts CityGaussian V1-original into the target directory.
Default target:
  ${DEST_DIR}
EOF
}

if [[ $# -gt 0 && ( "$1" == "-h" || "$1" == "--help" ) ]]; then
  usage
  exit 0
fi

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

if [[ $# -eq 1 ]]; then
  DEST_DIR="$1"
fi

mkdir -p "${DEST_DIR}"

curl -L "${URL}" -o "${ARCHIVE_PATH}"
tar -xzf "${ARCHIVE_PATH}" -C "${DEST_DIR}" --strip-components=1

cat <<EOF
Fetched CityGaussian V1-original source:
  archive: ${ARCHIVE_PATH}
  dest:    ${DEST_DIR}

Suggested next steps:
  1. scripts/install_citygaussian_v1_configs.sh --citygs-dir ${DEST_DIR}
  2. scripts/run_citygaussian_v1_train.sh --citygs-dir ${DEST_DIR}
EOF
