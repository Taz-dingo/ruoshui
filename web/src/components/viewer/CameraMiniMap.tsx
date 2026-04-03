import type { MiniMapConfig } from '../../content/types';

interface CameraMiniMapProps {
  map: MiniMapConfig;
  position: [number, number, number] | null;
  target: [number, number, number] | null;
  visibleGroundPolygon: [number, number, number][];
  yawDeg: number | null;
  distance: number | null;
}

const viewBoxSize = 180;
const center = viewBoxSize * 0.5;
const radius = 84;

function CameraMiniMap({
  map,
  position,
  target,
  visibleGroundPolygon,
  yawDeg,
  distance
}: CameraMiniMapProps) {
  const bounds = normalizeBounds(map);
  const fallbackAnchor: [number, number, number] = [
    (bounds.minX + bounds.maxX) * 0.5,
    0,
    (bounds.minZ + bounds.maxZ) * 0.5
  ];
  const anchor = isFiniteVec3(position) ? position : fallbackAnchor;
  const safeTarget = isFiniteVec3(target) ? target : null;
  const safeYawDeg = Number.isFinite(yawDeg) ? yawDeg : 0;
  const safeDistance = Number.isFinite(distance) ? distance : null;
  const safePolygon = visibleGroundPolygon.filter(isFiniteVec3);
  const scale = resolveMapScale(anchor, safeTarget, safePolygon, bounds, safeDistance);
  const mapFrame = resolveMapFrame(bounds, anchor, scale);
  const targetPoint = safeTarget
    ? projectPointAroundAnchor(safeTarget, anchor, scale)
    : projectPointAroundAnchor(resolveFallbackTarget(anchor, safeYawDeg), anchor, scale);
  const visibleGroundPath = buildPolygonPath(
    safePolygon.map((point) => projectPointAroundAnchor(point, anchor, scale))
  );

  return (
    <div className="minimap-card" aria-label="若水广场当前相机顶视图">
      <svg
        className="minimap-svg"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        role="img"
        aria-label="若水广场当前相机顶视图"
      >
        <defs>
          <clipPath id="ruoshui-minimap-circle">
            <circle cx={center} cy={center} r={radius} />
          </clipPath>
        </defs>

        <g clipPath="url(#ruoshui-minimap-circle)">
          <circle className="minimap-bg" cx={center} cy={center} r={radius} />
          {map.imageUrl ? (
            <image
              href={map.imageUrl}
              x={mapFrame.x}
              y={mapFrame.y}
              width={mapFrame.width}
              height={mapFrame.height}
              preserveAspectRatio="none"
            />
          ) : null}
          <circle className="minimap-image-tint" cx={center} cy={center} r={radius} />
          {visibleGroundPath ? (
            <path className="minimap-footprint" d={visibleGroundPath} />
          ) : null}
          {targetPoint ? (
            <>
              <line
                className="minimap-track"
                x1={center}
                y1={center}
                x2={targetPoint.x}
                y2={targetPoint.y}
              />
              <circle className="minimap-target-ring" cx={targetPoint.x} cy={targetPoint.y} r="7" />
              <circle className="minimap-target-dot" cx={targetPoint.x} cy={targetPoint.y} r="3.5" />
            </>
          ) : null}
          <circle className="minimap-camera-ring" cx={center} cy={center} r="10" />
          <circle className="minimap-camera-dot" cx={center} cy={center} r="4.5" />
        </g>

      </svg>
    </div>
  );
}

function resolveMapScale(
  anchor: [number, number, number],
  target: [number, number, number] | null,
  visibleGroundPolygon: [number, number, number][],
  bounds: ReturnType<typeof normalizeBounds>,
  distance: number | null
) {
  const polygonRadius = visibleGroundPolygon.reduce((maxRadius, point) => {
    const dx = Math.abs(point[0] - anchor[0]);
    const dz = Math.abs(point[2] - anchor[2]);
    return Math.max(maxRadius, dx, dz);
  }, 0);
  const targetRadius = target
    ? Math.max(Math.abs(target[0] - anchor[0]), Math.abs(target[2] - anchor[2]))
    : 0;
  const distanceRadius = distance
    ? clamp(distance * 0.72, 0.9, 2.3)
    : 1.2;
  const desiredWorldRadius = Math.max(
    polygonRadius * 1.12,
    targetRadius * 1.35,
    distanceRadius
  );
  const fullWorldRadius = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxZ - bounds.minZ
  ) * 0.5;
  const clampedRadius = clamp(desiredWorldRadius, 0.82, fullWorldRadius);

  return radius / Math.max(clampedRadius, 0.001);
}

function resolveMapFrame(
  bounds: ReturnType<typeof normalizeBounds>,
  anchor: [number, number, number],
  scale: number
) {
  const width = (bounds.maxX - bounds.minX) * scale;
  const height = (bounds.maxZ - bounds.minZ) * scale;

  return {
    x: safeNumber(center + (bounds.minX - anchor[0]) * scale, center - radius),
    y: safeNumber(center - (bounds.maxZ - anchor[2]) * scale, center - radius),
    width: safeNumber(width, radius * 2),
    height: safeNumber(height, radius * 2)
  };
}

function resolveFallbackTarget(
  anchor: [number, number, number],
  yawDeg: number | null
): [number, number, number] {
  const angle = ((yawDeg ?? 0) * Math.PI) / 180;
  return [
    anchor[0] - Math.sin(angle) * 0.65,
    anchor[1],
    anchor[2] - Math.cos(angle) * 0.65
  ];
}

function projectPointAroundAnchor(
  point: [number, number, number],
  anchor: [number, number, number],
  scale: number
) {
  return {
    x: safeNumber(center + (point[0] - anchor[0]) * scale, center),
    y: safeNumber(center - (point[2] - anchor[2]) * scale, center)
  };
}

function buildPolygonPath(points: Array<{ x: number; y: number }>) {
  const safePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
  );

  if (safePoints.length < 3) {
    return null;
  }

  return safePoints
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .concat('Z')
    .join(' ');
}

export {
  CameraMiniMap
};

function normalizeBounds(map: MiniMapConfig) {
  const minX = safeNumber(map.bounds.minX, -1);
  const maxX = safeNumber(map.bounds.maxX, 1);
  const minZ = safeNumber(map.bounds.minZ, -1);
  const maxZ = safeNumber(map.bounds.maxZ, 1);

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ)
  };
}

function isFiniteVec3(
  value: [number, number, number] | null | undefined
): value is [number, number, number] {
  return Boolean(
    value &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Number.isFinite(value[2])
  );
}

function safeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
