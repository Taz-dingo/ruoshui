export const renderScaleStorageKey = 'ruoshui-render-scale-percent';
export const routeRunHistoryStorageKey = 'ruoshui-route-run-history';
export const routeAnalysisCopyFeedbackMs = 1600;
export const renderScaleMinPercent = 70;
export const cameraMetaIntervalSeconds = 0.12;
export const perfHudIntervalSeconds = 0.5;
export const renderWakeSeconds = 0.25;
export const maxRouteRunHistory = 8;
export const stallFrameThresholdMs = 22;
export const severeStallFrameThresholdMs = 50;
export const lowAnglePrewarmPitchThresholdDeg = 52;
export const lowAnglePrewarmDistanceThreshold = 3.35;
export const lowAnglePrewarmLeadSeconds = 0.9;
export const lowAnglePrewarmHoldSeconds = 1.4;
export const lowAnglePrewarmMaxSeconds = 2.2;
export const currentVariantRepeatCount = 3;
export const minOrbitPitchDeg = 6;
export const maxOrbitPitchDeg = 89;
export const minOrbitTargetZ = 0;
export const minOrbitCameraZ = 0;

export const frameSampleIndices = {
  elapsedMs: 0,
  dtMs: 1,
  stepIndex: 2,
  posX: 3,
  posY: 4,
  posZ: 5,
  targetX: 6,
  targetY: 7,
  targetZ: 8,
  distance: 9,
  pitch: 10,
  yaw: 11
} as const;
