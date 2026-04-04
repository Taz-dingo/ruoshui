import {
  maxOrbitDistance,
  maxOrbitPitchDeg,
  minOrbitDistance,
  minOrbitCameraY,
  minOrbitPitchDeg,
  minOrbitTargetY,
  orbitDamping,
  orbitPanDistanceFactor,
  orbitPitchScreenFactor,
  orbitRotateScreenFactor,
  orbitWheelDeltaClamp,
  orbitZoomExponentialSpeed
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
  touchDistance: number;
  touchCenterX: number;
  touchCenterY: number;
  transition: OrbitTransition | null;
  onManualInput: (() => void) | null;
  tempRight: OrbitVector;
  tempUp: OrbitVector;
  tempForward: OrbitVector;
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
    minDistance: minOrbitDistance,
    maxDistance: maxOrbitDistance,
    rotateSpeed: orbitRotateScreenFactor,
    panSpeed: orbitPanDistanceFactor,
    zoomSpeed: orbitZoomExponentialSpeed,
    damping: orbitDamping,
    pointerMode: null,
    lastX: 0,
    lastY: 0,
    touchDistance: 0,
    touchCenterX: 0,
    touchCenterY: 0,
    transition: null,
    onManualInput: null,
    tempRight: new pc.Vec3(),
    tempUp: new pc.Vec3(),
    tempForward: new pc.Vec3(),
    tempPosition: new pc.Vec3(),
    destroy: () => {},
    cancelInteraction: () => {}
  };

  const beginPointer = (event: any) => {
    orbit.onManualInput?.();
    orbit.pointerMode =
      event.button === 2 || event.button === 1 || event.shiftKey ? 'pan' : 'rotate';
    if (performanceMode) {
      performanceMode.isInteracting = true;
    }
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  };

  const endPointer = () => {
    orbit.cancelInteraction();
  };

  const getViewportSize = () => {
    return {
      viewportWidth: Math.max(
        orbit.canvasElement.clientWidth || orbit.canvasElement.width || 1,
        1
      ),
      viewportHeight: Math.max(
        orbit.canvasElement.clientHeight || orbit.canvasElement.height || 1,
        1
      )
    };
  };

  const panOrbitTarget = (
    dx: number,
    dy: number,
    viewportWidth: number,
    viewportHeight: number
  ) => {
    const distanceFactor = Math.max(orbit.currentDistance, 0.55);
    const right = orbit.tempRight.copy(camera.right);
    right.y = 0;
    if (right.lengthSq() < 0.000001) {
      right.set(1, 0, 0);
    } else {
      right.normalize();
    }

    const forward = orbit.tempForward.copy(camera.forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.000001) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    const rightOffset = (-dx / viewportWidth) * orbit.panSpeed * distanceFactor;
    const forwardOffset = (dy / viewportHeight) * orbit.panSpeed * distanceFactor;
    orbit.transition = null;
    orbit.desiredTarget
      .add(right.mulScalar(rightOffset))
      .add(forward.mulScalar(forwardOffset));
    clampOrbitTarget(orbit.desiredTarget);
  };

  const movePointer = (event: any) => {
    if (!orbit.pointerMode) {
      return;
    }

    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    const { viewportWidth, viewportHeight } = getViewportSize();

    if (orbit.pointerMode === 'rotate') {
      orbit.transition = null;
      orbit.desiredYaw -= (dx / viewportWidth) * Math.PI * orbit.rotateSpeed;
      orbit.desiredPitch = clampOrbitPitch(
        orbit.desiredPitch -
          (dy / viewportHeight) * Math.PI * orbit.rotateSpeed * orbitPitchScreenFactor
      );
      return;
    }

    panOrbitTarget(dx, dy, viewportWidth, viewportHeight);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    orbit.onManualInput?.();
    orbit.transition = null;
    const deltaY = normalizeWheelDelta(event);
    const scale = Math.exp(deltaY * orbit.zoomSpeed);
    orbit.desiredDistance = clamp(
      orbit.desiredDistance * scale,
      orbit.minDistance,
      orbit.maxDistance
    );
  };

  const beginTouch = (event: TouchEvent) => {
    if (event.touches.length === 0) {
      return;
    }

    orbit.onManualInput?.();
    orbit.transition = null;
    if (performanceMode) {
      performanceMode.isInteracting = true;
    }

    if (event.touches.length === 1) {
      orbit.pointerMode = 'rotate';
      orbit.lastX = event.touches[0].clientX;
      orbit.lastY = event.touches[0].clientY;
      orbit.touchDistance = 0;
      return;
    }

    const firstTouch = event.touches[0];
    const secondTouch = event.touches[1];
    orbit.pointerMode = 'pan';
    orbit.touchCenterX = (firstTouch.clientX + secondTouch.clientX) * 0.5;
    orbit.touchCenterY = (firstTouch.clientY + secondTouch.clientY) * 0.5;
    orbit.touchDistance = getTouchDistance(firstTouch, secondTouch);
  };

  const moveTouch = (event: TouchEvent) => {
    if (event.touches.length === 0 || !orbit.pointerMode) {
      return;
    }

    event.preventDefault();
    orbit.onManualInput?.();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const { viewportWidth, viewportHeight } = getViewportSize();
      const dx = touch.clientX - orbit.lastX;
      const dy = touch.clientY - orbit.lastY;
      orbit.pointerMode = 'rotate';
      orbit.lastX = touch.clientX;
      orbit.lastY = touch.clientY;
      orbit.transition = null;
      orbit.desiredYaw -= (dx / viewportWidth) * Math.PI * orbit.rotateSpeed;
      orbit.desiredPitch = clampOrbitPitch(
        orbit.desiredPitch -
          (dy / viewportHeight) * Math.PI * orbit.rotateSpeed * orbitPitchScreenFactor
      );
      return;
    }

    const firstTouch = event.touches[0];
    const secondTouch = event.touches[1];
    const nextCenterX = (firstTouch.clientX + secondTouch.clientX) * 0.5;
    const nextCenterY = (firstTouch.clientY + secondTouch.clientY) * 0.5;
    const nextDistance = getTouchDistance(firstTouch, secondTouch);
    const { viewportWidth, viewportHeight } = getViewportSize();

    orbit.pointerMode = 'pan';
    panOrbitTarget(
      nextCenterX - orbit.touchCenterX,
      nextCenterY - orbit.touchCenterY,
      viewportWidth,
      viewportHeight
    );

    if (orbit.touchDistance > 0 && nextDistance > 0) {
      const pinchRatio = orbit.touchDistance / nextDistance;
      orbit.desiredDistance = clamp(
        orbit.desiredDistance * pinchRatio,
        orbit.minDistance,
        orbit.maxDistance
      );
    }

    orbit.touchCenterX = nextCenterX;
    orbit.touchCenterY = nextCenterY;
    orbit.touchDistance = nextDistance;
  };

  const endTouch = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      orbit.pointerMode = 'rotate';
      orbit.lastX = event.touches[0].clientX;
      orbit.lastY = event.touches[0].clientY;
      orbit.touchDistance = 0;
      return;
    }

    if (event.touches.length >= 2) {
      const firstTouch = event.touches[0];
      const secondTouch = event.touches[1];
      orbit.pointerMode = 'pan';
      orbit.touchCenterX = (firstTouch.clientX + secondTouch.clientX) * 0.5;
      orbit.touchCenterY = (firstTouch.clientY + secondTouch.clientY) * 0.5;
      orbit.touchDistance = getTouchDistance(firstTouch, secondTouch);
      return;
    }

    orbit.cancelInteraction();
  };

  canvasElement.addEventListener('mousedown', beginPointer);
  window.addEventListener('mousemove', movePointer);
  window.addEventListener('mouseup', endPointer);
  canvasElement.addEventListener('wheel', onWheel, { passive: false });
  canvasElement.addEventListener('touchstart', beginTouch, { passive: true });
  canvasElement.addEventListener('touchmove', moveTouch, { passive: false });
  canvasElement.addEventListener('touchend', endTouch);
  canvasElement.addEventListener('touchcancel', endTouch);

  orbit.destroy = () => {
    canvasElement.removeEventListener('mousedown', beginPointer);
    window.removeEventListener('mousemove', movePointer);
    window.removeEventListener('mouseup', endPointer);
    canvasElement.removeEventListener('wheel', onWheel);
    canvasElement.removeEventListener('touchstart', beginTouch);
    canvasElement.removeEventListener('touchmove', moveTouch);
    canvasElement.removeEventListener('touchend', endTouch);
    canvasElement.removeEventListener('touchcancel', endTouch);
  };

  orbit.cancelInteraction = () => {
    orbit.pointerMode = null;
    orbit.touchDistance = 0;
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

function normalizeWheelDelta(event: WheelEvent) {
  const deltaScale =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? 120
        : 1;

  return clamp(event.deltaY * deltaScale, -orbitWheelDeltaClamp, orbitWheelDeltaClamp);
}

function getTouchDistance(firstTouch: Touch, secondTouch: Touch) {
  const dx = firstTouch.clientX - secondTouch.clientX;
  const dy = firstTouch.clientY - secondTouch.clientY;
  return Math.hypot(dx, dy);
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
