#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="${ROOT_DIR}/configs/citygaussian-v1"

usage() {
  cat <<EOF
Usage: $0 --citygs-dir /path/to/CityGaussian

Installs Ruoshui-owned CityGaussian V1-original config templates into:
  <citygs-dir>/config/

Files:
  ruoshui_iteration001_coarse.yaml
  ruoshui_iteration001_c1_r1.yaml
EOF
}

CITYGS_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --citygs-dir)
      CITYGS_DIR="$2"
      shift 2
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

mkdir -p "${CITYGS_DIR}/config"

for name in ruoshui_iteration001_coarse.yaml ruoshui_iteration001_c1_r1.yaml; do
  ln -sfn "${TEMPLATE_DIR}/${name}" "${CITYGS_DIR}/config/${name}"
done

cat <<EOF
Installed Ruoshui CityGaussian V1 configs:
  ${CITYGS_DIR}/config/ruoshui_iteration001_coarse.yaml
  ${CITYGS_DIR}/config/ruoshui_iteration001_c1_r1.yaml

Current template assumptions:
  block_dim:  [1, 1, 1]
  aabb:       [-9.1, -10.5, -3.7, 8.9, 11.1, 7.2]
  resolution: 4

These are bootstrap values for the first V1 entry, not the final large-scene plan.
EOF
