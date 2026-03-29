import {
  maxOrbitPitchDeg,
  minOrbitCameraY,
  minOrbitPitchDeg,
  minOrbitTargetY
} from '../config';
import type { PerformanceMode } from './types';
import { clamp, degToRad, easeInOutCubic, lerp, lerpAngle } from '../utils/math';

type OrbitVector = any;
type OrbitCamera = any;
type PlayCanvasModule = {
  Vec3: new (x?: number, y?: number, z?: number) => any;
};

type OrbitPointerMode = 'pan' | 'rotate' | null;

interface OrbitTransition {
  elapsed: number;
  duration: number;
  fromTarget: OrbitVector;
  toTarget: OrbitVector;
  fromYaw: number;
  toYaw: number;
  fromPitch: number;
  toPitch: number;
  fromDistance: number;
  toDistance: number;
}

export interface OrbitSnapshot {
  target: OrbitVector;
  yaw: number;
  pitch: number;
  distance: number;
}

export interface OrbitController {
  camera: OrbitCamera;
  canvasElement: HTMLCanvasElement;
  currentTarget: OrbitVector;
  desiredTarget: OrbitVector;
  currentYaw: number;
  desiredYaw: number;
  currentPitch: number;
  desiredPitch: number;
  currentDistance: number;
  desiredDistance: number;
  minDistance: number;
  maxDistance: number;
  rotateSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  damping: number;
  pointerMode: OrbitPointerMode;
  lastX: number;
  lastY: number;
  transition: OrbitTransition | null;
  onManualInput: (() => void) | null;
  tempRight: OrbitVector;
  tempUp: OrbitVector;
  tempPosition: OrbitVector;
  destroy: () => void;
  cancelInteraction: () => void;
}

export function createOrbitController(
  pc: PlayCanvasModule,
  camera: OrbitCamera,
  canvasElement: HTMLCanvasElement,
  initialPosition: OrbitVector,
  initialTarget: OrbitVector,
  performanceMode: PerformanceMode | null
): OrbitController {
  const clampedTarget = clampOrbitTarget(initialTarget.clone());
  const clampedPosition = clampOrbitCameraPosition(initialPosition.clone(), clampedTarget);
  const spherical = positionToOrbit(clampedPosition, clampedTarget);

  const orbit: OrbitController = {
    camera,
    canvasElement,
    currentTarget: clampedTarget.clone(),
    desiredTarget: clampedTarget.clone(),
    currentYaw: spherical.yaw,
    desiredYaw: spherical.yaw,
    currentPitch: spherical.pitch,
    desiredPitch: spherical.pitch,
    currentDistance: spherical.distance,
    desiredDistance: spherical.distance,
    minDistance: 0.35,
    maxDistance: 3,
    rotateSpeed: 0.0055,
    panSpeed: 0.0018,
    zoomSpeed: 0.0012,
    damping: 0.14,
    pointerMode: null,
    lastX: 0,
    lastY: 0,
    transition: null,
    onManualInput: null,
    tempRight: new pc.Vec3(),
    tempUp: new pc.Vec3(),
    tempPosition: new pc.Vec3(),
    destroy: () => {},
    cancelInteraction: () => {}
  };

  const beginPointer = (event: any) => {
    orbit.onManualInput?.();
    orbit.pointerMode = event.button === 2 ? 'pan' : 'rotate';
    if (performanceMode) {
      performanceMode.isInteracting = true;
    }
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  };

  const endPointer = () => {
    orbit.cancelInteraction();
  };

  const movePointer = (event: any) => {
    if (!orbit.pointerMode) {
      return;
    }

    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    if (orbit.pointerMode === 'rotate') {
      orbit.transition = null;
      orbit.desiredYaw -= dx * orbit.rotateSpeed;
      orbit.desiredPitch = clampOrbitPitch(orbit.desiredPitch - dy * orbit.rotateSpeed);
      return;
    }

    const distanceFactor = Math.max(orbit.currentDistance, 0.5);
    const right = orbit.tempRight.copy(camera.right).mulScalar(-dx * orbit.panSpeed * distanceFactor);
    const up = orbit.tempUp.copy(camera.up).mulScalar(dy * orbit.panSpeed * distanceFactor);
    orbit.transition = null;
    orbit.desiredTarget.add(right).add(up);
    clampOrbitTarget(orbit.desiredTarget);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    orbit.onManualInput?.();
    orbit.transition = null;
    const scale = Math.exp(event.deltaY * orbit.zoomSpeed);
    orbit.desiredDistance = clamp(
      orbit.desiredDistance * scale,
      orbit.minDistance,
      orbit.maxDistance
    );
  };

  canvasElement.addEventListener('mousedown', beginPointer);
  window.addEventListener('mousemove', movePointer);
  window.addEventListener('mouseup', endPointer);
  canvasElement.addEventListener('wheel', onWheel, { passive: false });

  orbit.destroy = () => {
    canvasElement.removeEventListener('mousedown', beginPointer);
    window.removeEventListener('mousemove', movePointer);
    window.removeEventListener('mouseup', endPointer);
    canvasElement.removeEventListener('wheel', onWheel);
  };

  orbit.cancelInteraction = () => {
    orbit.pointerMode = null;
    if (performanceMode) {
      performanceMode.isInteracting = false;
    }
  };

  applyOrbit(orbit, 1, pc);
  return orbit;
}

export function captureOrbitView(orbit: OrbitController | null | undefined): OrbitSnapshot | null {
  if (!orbit) {
    return null;
  }

  return {
    target: orbit.currentTarget.clone(),
    yaw: orbit.currentYaw,
    pitch: orbit.currentPitch,
    distance: orbit.currentDistance
  };
}

export function restoreOrbitView(
  orbit: OrbitController | null | undefined,
  snapshot: OrbitSnapshot | null | undefined,
  pc: PlayCanvasModule
): boolean {
  if (!orbit || !snapshot) {
    return false;
  }

  const clampedPitch = clampOrbitPitch(snapshot.pitch);
  const clampedTarget = clampOrbitTarget(snapshot.target.clone());
  orbit.transition = null;
  orbit.currentTarget.copy(clampedTarget);
  orbit.desiredTarget.copy(clampedTarget);
  orbit.currentYaw = snapshot.yaw;
  orbit.desiredYaw = snapshot.yaw;
  orbit.currentPitch = clampedPitch;
  orbit.desiredPitch = clampedPitch;
  orbit.currentDistance = clamp(snapshot.distance, orbit.minDistance, orbit.maxDistance);
  orbit.desiredDistance = clamp(snapshot.distance, orbit.minDistance, orbit.maxDistance);
  applyOrbit(orbit, 1, pc);
  return true;
}

export function setOrbitPreset(
  orbit: OrbitController,
  position: OrbitVector,
  target: OrbitVector,
  immediate: boolean,
  pc: PlayCanvasModule,
  duration = 1.35
) {
  const clampedTarget = clampOrbitTarget(target.clone());
  const clampedPosition = clampOrbitCameraPosition(position.clone(), clampedTarget);
  const spherical = positionToOrbit(clampedPosition, clampedTarget);
  const clampedPitch = clampOrbitPitch(spherical.pitch);

  if (immediate) {
    orbit.transition = null;
    orbit.currentTarget.copy(clampedTarget);
    orbit.desiredTarget.copy(clampedTarget);
    orbit.currentYaw = spherical.yaw;
    orbit.desiredYaw = spherical.yaw;
    orbit.currentPitch = clampedPitch;
    orbit.desiredPitch = clampedPitch;
    orbit.currentDistance = spherical.distance;
    orbit.desiredDistance = spherical.distance;
    applyOrbit(orbit, 1, pc);
    return;
  }

  orbit.transition = {
    elapsed: 0,
    duration: Math.max(duration, 0.01),
    fromTarget: orbit.desiredTarget.clone(),
    toTarget: clampedTarget,
    fromYaw: orbit.desiredYaw,
    toYaw: spherical.yaw,
    fromPitch: orbit.desiredPitch,
    toPitch: clampedPitch,
    fromDistance: orbit.desiredDistance,
    toDistance: spherical.distance
  };
}

export function updateOrbitController(
  orbit: OrbitController,
  dt: number,
  pc: PlayCanvasModule
) {
  if (orbit.transition) {
    orbit.transition.elapsed = Math.min(orbit.transition.elapsed + dt, orbit.transition.duration);
    const alpha = orbit.transition.elapsed / orbit.transition.duration;
    const eased = easeInOutCubic(alpha);

    orbit.desiredTarget.lerp(orbit.transition.fromTarget, orbit.transition.toTarget, eased);
    orbit.desiredYaw = lerpAngle(orbit.transition.fromYaw, orbit.transition.toYaw, eased);
    orbit.desiredPitch = lerp(orbit.transition.fromPitch, orbit.transition.toPitch, eased);
    orbit.desiredDistance = lerp(
      orbit.transition.fromDistance,
      orbit.transition.toDistance,
      eased
    );

    if (alpha >= 1) {
      orbit.transition = null;
    }
  }

  return applyOrbit(orbit, orbit.damping, pc);
}

function applyOrbit(orbit: OrbitController, damping: number, pc: PlayCanvasModule) {
  const previousTargetX = orbit.currentTarget.x;
  const previousTargetY = orbit.currentTarget.y;
  const previousTargetZ = orbit.currentTarget.z;
  const previousYaw = orbit.currentYaw;
  const previousPitch = orbit.currentPitch;
  const previousDistance = orbit.currentDistance;
  const blend = damping >= 1 ? 1 : 1 - Math.pow(1 - damping, 2);
  clampOrbitTarget(orbit.desiredTarget);
  orbit.desiredDistance = clamp(
    orbit.desiredDistance,
    orbit.minDistance,
    orbit.maxDistance
  );
  orbit.currentTarget.lerp(orbit.currentTarget, orbit.desiredTarget, blend);
  clampOrbitTarget(orbit.currentTarget);
  orbit.currentYaw = lerpAngle(orbit.currentYaw, orbit.desiredYaw, blend);
  orbit.currentPitch = lerp(orbit.currentPitch, orbit.desiredPitch, blend);
  orbit.currentDistance = clamp(
    lerp(orbit.currentDistance, orbit.desiredDistance, blend),
    orbit.minDistance,
    orbit.maxDistance
  );

  const position = orbitToPosition(
    orbit.currentTarget,
    orbit.currentYaw,
    orbit.currentPitch,
    orbit.currentDistance,
    orbit.tempPosition,
    pc
  );
  clampOrbitCameraPosition(position, orbit.currentTarget);
  orbit.camera.setPosition(position);
  orbit.camera.lookAt(orbit.currentTarget);

  return (
    Math.abs(previousTargetX - orbit.currentTarget.x) > 0.00001 ||
    Math.abs(previousTargetY - orbit.currentTarget.y) > 0.00001 ||
    Math.abs(previousTargetZ - orbit.currentTarget.z) > 0.00001 ||
    Math.abs(previousYaw - orbit.currentYaw) > 0.00001 ||
    Math.abs(previousPitch - orbit.currentPitch) > 0.00001 ||
    Math.abs(previousDistance - orbit.currentDistance) > 0.00001
  );
}

function positionToOrbit(position: OrbitVector, target: OrbitVector) {
  const offset = position.clone().sub(target);
  const distance = Math.max(offset.length(), 0.0001);
  return {
    distance,
    yaw: Math.atan2(offset.x, offset.z),
    pitch: clampOrbitPitch(Math.asin(clamp(offset.y / distance, -1, 1)))
  };
}

function clampOrbitPitch(value: number) {
  return clamp(value, degToRad(minOrbitPitchDeg), degToRad(maxOrbitPitchDeg));
}

function clampOrbitTarget(target: OrbitVector) {
  target.y = Math.max(target.y, minOrbitTargetY);
  return target;
}

function clampOrbitCameraPosition(position: OrbitVector, target: OrbitVector) {
  position.y = Math.max(position.y, minOrbitCameraY);

  if (
    target &&
    Math.abs(position.x - target.x) < 0.0001 &&
    Math.abs(position.y - target.y) < 0.0001 &&
    Math.abs(position.z - target.z) < 0.0001
  ) {
    position.y = Math.max(target.y + 0.0001, minOrbitCameraY);
  }

  return position;
}

function orbitToPosition(
  target: OrbitVector,
  yaw: number,
  pitch: number,
  distance: number,
  out: OrbitVector | undefined,
  pc: PlayCanvasModule
) {
  const cosPitch = Math.cos(pitch);
  const next = out ?? new pc.Vec3();
  return next.set(
    target.x + Math.sin(yaw) * cosPitch * distance,
    target.y + Math.sin(pitch) * distance,
    target.z + Math.cos(yaw) * cosPitch * distance
  );
}
