#!/usr/bin/env bash
set -euo pipefail
REAL_COLMAP="${REAL_COLMAP:-/opt/homebrew/bin/colmap}"

if [[ "${1:-}" == "-h" ]]; then
  printf 'COLMAP 4.0 -- Structure-from-Motion and Multi-View Stereo\n'
  exec "$REAL_COLMAP" help
fi

args=("$@")
for i in "${!args[@]}"; do
  case "${args[$i]}" in
    --SiftExtraction.use_gpu)
      args[$i]='--FeatureExtraction.use_gpu'
      ;;
    --SiftMatching.use_gpu)
      args[$i]='--FeatureMatching.use_gpu'
      ;;
  esac
done

exec "$REAL_COLMAP" "${args[@]}"
