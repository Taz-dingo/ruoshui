import type { MiniMapConfig } from '../../content/types';
import { clamp, degToRad } from '../../utils/math';

interface CameraMiniMapProps {
  map: MiniMapConfig;
  position: [number, number, number] | null;
  target: [number, number, number] | null;
  yawDeg: number | null;
  distance: number | null;
}

const viewBoxWidth = 220;
const viewBoxHeight = 168;
const mapPadding = 18;

function CameraMiniMap({
  map,
  position,
  target,
  yawDeg,
  distance
}: CameraMiniMapProps) {
  const campusRect = {
    x: mapPadding,
    y: mapPadding + 8,
    width: viewBoxWidth - mapPadding * 2,
    height: viewBoxHeight - mapPadding * 2 - 16
  };
  const cameraPoint = projectPoint(position, map, campusRect);
  const targetPoint = projectPoint(target, map, campusRect);
  const cameraVisible = Boolean(cameraPoint && targetPoint);
  const direction = resolveDirection(cameraPoint, targetPoint, yawDeg);
  const coneDistance = clamp((distance ?? 0.85) * 34, 28, 52);
  const conePath = cameraPoint
    ? buildConePath(cameraPoint, direction, coneDistance, 0.32)
    : null;
  const northRotateDeg = map.northAngleDeg ?? 0;

  return (
    <div className="minimap-card">
      <div className="minimap-head">
        <div>
          <strong>{map.label}</strong>
          <span>{map.subtitle}</span>
        </div>
        <span className="minimap-north">
          北
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <g transform={`rotate(${northRotateDeg} 12 12)`}>
              <path d="M12 4 L16 14 L12 11 L8 14 Z" />
            </g>
          </svg>
        </span>
      </div>
      <svg
        className="minimap-svg"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        role="img"
        aria-label="若水广场当前相机顶视示意图"
      >
        <defs>
          <pattern
            id="ruoshui-minimap-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 20 0 L 0 0 0 20" className="minimap-grid-line" />
          </pattern>
        </defs>
        <rect
          className="minimap-bg"
          x="0"
          y="0"
          width={viewBoxWidth}
          height={viewBoxHeight}
          rx="22"
        />
        <rect
          className="minimap-campus"
          x={campusRect.x}
          y={campusRect.y}
          width={campusRect.width}
          height={campusRect.height}
          rx="20"
        />
        <rect
          className="minimap-grid"
          x={campusRect.x}
          y={campusRect.y}
          width={campusRect.width}
          height={campusRect.height}
          rx="20"
          fill="url(#ruoshui-minimap-grid)"
        />
        {map.landmarks?.map((landmark) => {
          const point = projectPoint([landmark.x, 0, landmark.z], map, campusRect);
          if (!point) {
            return null;
          }

          return (
            <g key={landmark.id}>
              <circle className="minimap-landmark-dot" cx={point.x} cy={point.y} r="3.5" />
              <text className="minimap-landmark-label" x={point.x + 6} y={point.y - 6}>
                {landmark.name}
              </text>
            </g>
          );
        })}
        {conePath ? <path className="minimap-cone" d={conePath} /> : null}
        {cameraVisible && targetPoint ? (
          <line
            className="minimap-track"
            x1={cameraPoint?.x}
            y1={cameraPoint?.y}
            x2={targetPoint.x}
            y2={targetPoint.y}
          />
        ) : null}
        {targetPoint ? (
          <>
            <circle className="minimap-target-ring" cx={targetPoint.x} cy={targetPoint.y} r="8" />
            <circle className="minimap-target-dot" cx={targetPoint.x} cy={targetPoint.y} r="3.5" />
          </>
        ) : null}
        {cameraPoint ? (
          <>
            <circle className="minimap-camera-ring" cx={cameraPoint.x} cy={cameraPoint.y} r="10" />
            <circle className="minimap-camera-dot" cx={cameraPoint.x} cy={cameraPoint.y} r="4.5" />
          </>
        ) : null}
      </svg>
      <div className="minimap-legend">
        <span>
          <i className="is-camera" />
          当前相机
        </span>
        <span>
          <i className="is-target" />
          当前注视点
        </span>
        <span>
          <i className="is-cone" />
          朝向 / 可视范围
        </span>
      </div>
    </div>
  );
}

function projectPoint(
  point: [number, number, number] | null,
  map: MiniMapConfig,
  rect: { x: number; y: number; width: number; height: number }
) {
  if (!point) {
    return null;
  }

  const { minX, maxX, minZ, maxZ } = map.bounds;
  const normalizedX = clamp((point[0] - minX) / (maxX - minX), 0, 1);
  const normalizedZ = clamp((point[2] - minZ) / (maxZ - minZ), 0, 1);

  return {
    x: rect.x + normalizedX * rect.width,
    y: rect.y + (1 - normalizedZ) * rect.height
  };
}

function resolveDirection(
  cameraPoint: { x: number; y: number } | null,
  targetPoint: { x: number; y: number } | null,
  yawDeg: number | null
) {
  if (cameraPoint && targetPoint) {
    const dx = targetPoint.x - cameraPoint.x;
    const dy = targetPoint.y - cameraPoint.y;
    const length = Math.hypot(dx, dy);

    if (length > 0.0001) {
      return {
        x: dx / length,
        y: dy / length
      };
    }
  }

  const angle = degToRad((yawDeg ?? 0) + 180);
  return {
    x: Math.sin(angle),
    y: Math.cos(angle)
  };
}

function buildConePath(
  cameraPoint: { x: number; y: number },
  direction: { x: number; y: number },
  radius: number,
  halfAngle: number
) {
  const baseAngle = Math.atan2(direction.y, direction.x);
  const start = polarToPoint(cameraPoint, baseAngle - halfAngle, radius);
  const end = polarToPoint(cameraPoint, baseAngle + halfAngle, radius);

  return [
    `M ${cameraPoint.x} ${cameraPoint.y}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}

function polarToPoint(
  center: { x: number; y: number },
  angle: number,
  radius: number
) {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

export {
  CameraMiniMap
};
