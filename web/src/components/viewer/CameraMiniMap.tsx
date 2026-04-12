import type {
  MiniMapConfig,
  MiniMapImageTransform
} from '../../content/types';

interface CameraMiniMapProps {
  map: MiniMapConfig;
  imageTransform?: MiniMapImageTransform;
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
  imageTransform,
  position,
  target,
  visibleGroundPolygon,
  yawDeg,
  distance
}: CameraMiniMapProps) {
  const bounds = resolveDisplayBounds(map);
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
  const resolvedImageTransform = normalizeImageTransform(
    map.imageTransform,
    imageTransform,
    map.northAngleDeg
  );
  const projectionOptions = {
    invertWorldX: resolvedImageTransform.invertWorldX,
    invertWorldZ: resolvedImageTransform.invertWorldZ
  };
  const scale = resolveMapScale(anchor, safeTarget, safePolygon, bounds, safeDistance);
  const mapFrame = resolveMapFrame(map, bounds, anchor, scale, projectionOptions);
  const mapFrameCenterX = mapFrame.x + mapFrame.width * 0.5;
  const mapFrameCenterY = mapFrame.y + mapFrame.height * 0.5;
  const targetPoint = safeTarget
    ? projectPointAroundAnchor(safeTarget, anchor, scale, projectionOptions)
    : projectPointAroundAnchor(
        resolveFallbackTarget(anchor, safeYawDeg),
        anchor,
        scale,
        projectionOptions
      );
  const visibleGroundPath = buildPolygonPath(
    safePolygon.map((point) =>
      projectPointAroundAnchor(point, anchor, scale, projectionOptions)
    )
  );
  const projectedLandmarks = (map.landmarks ?? [])
    .map((landmark) => ({
      id: landmark.id,
      name: landmark.name,
      point: projectPointAroundAnchor(
        [landmark.x, 0, landmark.z],
        anchor,
        scale,
        projectionOptions
      )
    }))
    .filter(({ point }) => isPointInsideCircle(point));

  return (
    <div
      className="relative h-[186px] w-[186px] overflow-hidden rounded-full border border-ink/10 bg-[rgba(27,23,19,0.42)] opacity-100 shadow-[inset_0_1px_0_rgba(255,246,232,0.04),0_10px_22px_rgba(11,10,8,0.14)] max-[760px]:h-[118px] max-[760px]:w-[118px]"
      aria-label="若水广场当前相机顶视图"
    >
      <svg
        className="block h-full w-full overflow-hidden rounded-full"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        role="img"
        aria-label="若水广场当前相机顶视图"
        style={{ clipPath: 'circle(50% at 50% 50%)' }}
      >
        <defs>
          <clipPath id="ruoshui-minimap-circle">
            <circle cx={center} cy={center} r={radius} />
          </clipPath>
        </defs>

        <g clipPath="url(#ruoshui-minimap-circle)">
          <circle cx={center} cy={center} r={radius} fill="rgba(27, 23, 19, 0.54)" />
          {map.imageUrl ? (
            <g
              transform={`translate(${resolvedImageTransform.translateX} ${resolvedImageTransform.translateY})`}
            >
              <g
                transform={[
                  `translate(${mapFrameCenterX} ${mapFrameCenterY})`,
                  `rotate(${resolvedImageTransform.rotationDeg})`,
                  `scale(${resolvedImageTransform.scaleX} ${resolvedImageTransform.scaleY})`,
                  `translate(${-mapFrameCenterX} ${-mapFrameCenterY})`
                ].join(' ')}
              >
                <image
                  href={map.imageUrl}
                  x={mapFrame.x}
                  y={mapFrame.y}
                  width={mapFrame.width}
                  height={mapFrame.height}
                  preserveAspectRatio="xMidYMid meet"
                  opacity="1"
                />
              </g>
            </g>
          ) : null}
          {projectedLandmarks.map((landmark) => (
            <g key={landmark.id}>
              <circle
                cx={landmark.point.x}
                cy={landmark.point.y}
                r="5.5"
                fill="rgba(28, 24, 18, 0.24)"
                stroke="rgba(214, 231, 184, 0.34)"
                strokeWidth="1.1"
              />
              <circle
                cx={landmark.point.x}
                cy={landmark.point.y}
                r="2.5"
                fill="rgba(168, 201, 125, 0.95)"
              />
              <text
                x={landmark.point.x + 7}
                y={landmark.point.y - 7}
                style={{
                  fill: 'rgba(244, 236, 222, 0.64)',
                  fontSize: '8px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  paintOrder: 'stroke',
                  stroke: 'rgba(28, 24, 18, 0.4)',
                  strokeWidth: '2px',
                  strokeLinejoin: 'round'
                }}
              >
                {landmark.name}
              </text>
            </g>
          ))}
          {visibleGroundPath ? (
            <path
              d={visibleGroundPath}
              fill="rgba(168, 201, 125, 0.2)"
              stroke="rgba(220, 242, 184, 0.58)"
              strokeWidth="1.2"
            />
          ) : null}
          {targetPoint ? (
            <>
              <line
                x1={center}
                y1={center}
                x2={targetPoint.x}
                y2={targetPoint.y}
                stroke="rgba(244, 236, 222, 0.34)"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />
              <circle cx={targetPoint.x} cy={targetPoint.y} r="7" fill="none" stroke="rgba(168, 201, 125, 0.42)" strokeWidth="1.5" />
              <circle cx={targetPoint.x} cy={targetPoint.y} r="3.5" fill="rgba(168, 201, 125, 0.95)" />
            </>
          ) : null}
          <circle cx={center} cy={center} r="10" fill="none" stroke="rgba(255, 231, 200, 0.48)" strokeWidth="1.5" />
          <circle cx={center} cy={center} r="4.5" fill="rgba(244, 220, 190, 0.96)" />
        </g>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(244, 236, 222, 0.18)" strokeWidth="1.1" />
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
  map: MiniMapConfig,
  bounds: ReturnType<typeof normalizeBounds>,
  anchor: [number, number, number],
  scale: number,
  options?: ProjectionOptions
) {
  const contentRect = normalizeContentRect(map.contentRect);
  const projectedMinX = projectMapX(bounds.minX, anchor[0], scale, options);
  const projectedMaxX = projectMapX(bounds.maxX, anchor[0], scale, options);
  const projectedMinY = projectMapY(bounds.minZ, anchor[2], scale, options);
  const projectedMaxY = projectMapY(bounds.maxZ, anchor[2], scale, options);
  const contentLeft = Math.min(projectedMinX, projectedMaxX);
  const contentTop = Math.min(projectedMinY, projectedMaxY);
  const contentWidth = Math.abs(projectedMaxX - projectedMinX);
  const contentHeight = Math.abs(projectedMaxY - projectedMinY);
  const imageWidth = contentWidth / contentRect.width;
  const imageHeight = contentHeight / contentRect.height;

  return {
    x: safeNumber(contentLeft - imageWidth * contentRect.x, center - radius),
    y: safeNumber(contentTop - imageHeight * contentRect.y, center - radius),
    width: safeNumber(imageWidth, radius * 2),
    height: safeNumber(imageHeight, radius * 2)
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
  scale: number,
  options?: ProjectionOptions
) {
  return {
    x: safeNumber(projectMapX(point[0], anchor[0], scale, options), center),
    y: safeNumber(projectMapY(point[2], anchor[2], scale, options), center)
  };
}

interface ProjectionOptions {
  invertWorldX?: boolean;
  invertWorldZ?: boolean;
}

function projectMapX(
  worldX: number,
  anchorX: number,
  scale: number,
  options?: ProjectionOptions
) {
  const directionX = options?.invertWorldX ? -1 : 1;
  return center + (worldX - anchorX) * scale * directionX;
}

function projectMapY(
  worldZ: number,
  anchorZ: number,
  scale: number,
  options?: ProjectionOptions
) {
  const directionZ = options?.invertWorldZ ? 1 : -1;
  return center + (worldZ - anchorZ) * scale * directionZ;
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

function isPointInsideCircle(point: { x: number; y: number }) {
  return Math.hypot(point.x - center, point.y - center) <= radius - 6;
}

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

function resolveDisplayBounds(map: MiniMapConfig) {
  const bounds = normalizeBounds(map);
  const contentRect = normalizeContentRect(map.contentRect);
  const imageAspectRatio = safeNumber(map.imageAspectRatio ?? 1, 1);
  const imageContentAspectRatio =
    (imageAspectRatio * contentRect.width) / Math.max(contentRect.height, 0.001);
  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxZ - bounds.minZ;
  const worldAspectRatio = worldWidth / Math.max(worldHeight, 0.001);

  if (!Number.isFinite(imageContentAspectRatio) || imageContentAspectRatio <= 0) {
    return bounds;
  }

  if (Math.abs(worldAspectRatio - imageContentAspectRatio) < 0.001) {
    return bounds;
  }

  const centerX = (bounds.minX + bounds.maxX) * 0.5;
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;

  if (worldAspectRatio < imageContentAspectRatio) {
    const expandedWidth = worldHeight * imageContentAspectRatio;
    return {
      minX: centerX - expandedWidth * 0.5,
      maxX: centerX + expandedWidth * 0.5,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ
    };
  }

  const expandedHeight = worldWidth / imageContentAspectRatio;
  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: centerZ - expandedHeight * 0.5,
    maxZ: centerZ + expandedHeight * 0.5
  };
}

function normalizeImageTransform(
  baseTransform: MiniMapImageTransform | undefined,
  overrideTransform: MiniMapImageTransform | undefined,
  northAngleDeg: number | undefined
) {
  const mergedTransform = {
    ...baseTransform,
    ...overrideTransform
  };
  const scale = clamp(safeNumber(mergedTransform.scale ?? 1, 1), 0.1, 4);
  const flipX = Boolean(mergedTransform.flipX);
  const flipY = Boolean(mergedTransform.flipY);

  return {
    rotationDeg: safeNumber(
      mergedTransform.rotationDeg ?? northAngleDeg ?? 0,
      0
    ),
    translateX: safeNumber(mergedTransform.translateX ?? 0, 0),
    translateY: safeNumber(mergedTransform.translateY ?? 0, 0),
    invertWorldX: Boolean(
      mergedTransform.invertWorldX ?? mergedTransform.invertHeadingX
    ),
    invertWorldZ: Boolean(mergedTransform.invertWorldZ),
    invertHeadingX: Boolean(mergedTransform.invertHeadingX),
    scaleX: scale * (flipX ? -1 : 1),
    scaleY: scale * (flipY ? -1 : 1)
  };
}

function normalizeContentRect(contentRect: MiniMapConfig['contentRect']) {
  if (!contentRect) {
    return {
      x: 0,
      y: 0,
      width: 1,
      height: 1
    };
  }

  const x = clamp(safeNumber(contentRect.x, 0), 0, 0.95);
  const y = clamp(safeNumber(contentRect.y, 0), 0, 0.95);
  const width = clamp(safeNumber(contentRect.width, 1), 0.05, 1 - x);
  const height = clamp(safeNumber(contentRect.height, 1), 0.05, 1 - y);

  return {
    x,
    y,
    width,
    height
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

export {
  CameraMiniMap
};
