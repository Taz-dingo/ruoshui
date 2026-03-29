import {
  cameraMetaIntervalSeconds,
  lowAnglePrewarmDistanceThreshold,
  lowAnglePrewarmHoldSeconds,
  lowAnglePrewarmLeadSeconds,
  lowAnglePrewarmMaxSeconds,
  lowAnglePrewarmPitchThresholdDeg,
  perfHudIntervalSeconds
} from '../config';
import {
  endMotionSession,
  recordBenchmarkRouteFrame,
  sampleMotionFrame
} from '../benchmark/runtime';
import { updatePerformanceMode } from '../performance/render-scale';
import { updateOrbitController } from './orbit';
import { applyUnifiedGsplatProfile } from './unified-gsplat-profile';
import { clamp, radToDeg, roundNumber } from '../utils/math';

interface CreateRuntimeUpdateHandlerArgs {
  pc: any;
  runtimeState: any;
  updateBenchmarkRoute: (runtimeState: any, dt: number) => boolean;
  publishVariantBenchmark: (variantId: string) => void;
  renderCameraMeta: (runtimeState: any) => void;
  renderPerfHud: (runtimeState: any) => void;
}

function createRuntimeUpdateHandler({
  pc,
  runtimeState,
  updateBenchmarkRoute,
  publishVariantBenchmark,
  renderCameraMeta,
  renderPerfHud
}: CreateRuntimeUpdateHandlerArgs) {
  return (dt: number) => {
    const routeChanged = updateBenchmarkRoute(runtimeState, dt);
    const orbitChanged = updateOrbitController(runtimeState.orbit, dt, pc);
    const performanceChanged = updatePerformanceMode(runtimeState.performanceMode, runtimeState.app, dt);
    const isMoving =
      routeChanged || orbitChanged || runtimeState.performanceMode.isInteracting;
    const unifiedLodChanged = updateUnifiedLodWarmup(runtimeState, dt, isMoving);
    const hasActiveRoutePlayback = Boolean(runtimeState.routePlayback);

    if (runtimeState.routeRecord && hasActiveRoutePlayback) {
      recordBenchmarkRouteFrame({
        orbit: runtimeState.orbit,
        routeRecord: runtimeState.routeRecord,
        stepIndex: runtimeState.routePlayback.stepIndex,
        dt
      });
    }

    const keepRendering =
      hasActiveRoutePlayback ||
      isMoving ||
      performanceChanged ||
      isUnifiedLodWarmupActive(runtimeState);

    if (isMoving) {
      sampleMotionFrame(runtimeState.benchmark, dt);
    } else if (endMotionSession(runtimeState.benchmark)) {
      publishVariantBenchmark(runtimeState.variantId);
    }

    if (keepRendering) {
      runtimeState.requestRender();
    } else if (runtimeState.renderWakeRemaining > 0) {
      runtimeState.renderWakeRemaining = Math.max(0, runtimeState.renderWakeRemaining - dt);
      if (runtimeState.renderWakeRemaining === 0) {
        runtimeState.app.autoRender = false;
        runtimeState.loopController.sleep();
      }
    }

    runtimeState.cameraMetaElapsed += dt;
    if (runtimeState.cameraMetaElapsed >= cameraMetaIntervalSeconds) {
      renderCameraMeta(runtimeState);
      runtimeState.cameraMetaElapsed = 0;
    }

    runtimeState.perfHudElapsed += dt;
    runtimeState.perfHudFrames += 1;
    if (runtimeState.perfHudElapsed >= perfHudIntervalSeconds) {
      renderPerfHud(runtimeState);
      runtimeState.perfHudElapsed = 0;
      runtimeState.perfHudFrames = 0;
    }

    if (unifiedLodChanged) {
      runtimeState.requestRender();
    }
  };
}

function updateUnifiedLodWarmup(runtimeState: any, dt: number, isMoving: boolean) {
  const state = runtimeState?.unifiedLodState;
  const orbit = runtimeState?.orbit;

  if (!state || !orbit) {
    return false;
  }

  const riskSnapshot = getUnifiedLodRiskSnapshot(orbit);
  state.riskSnapshot = riskSnapshot;

  if (riskSnapshot.shouldPrewarm) {
    const refillSeconds = isMoving ? lowAnglePrewarmLeadSeconds : lowAnglePrewarmHoldSeconds;
    state.warmSecondsRemaining = Math.min(
      lowAnglePrewarmMaxSeconds,
      Math.max(state.warmSecondsRemaining, refillSeconds)
    );
  }

  const nextMode = state.warmSecondsRemaining > 0 ? 'warmup' : 'base';
  const modeChanged = state.mode !== nextMode;
  let profileChanged = false;

  if (modeChanged) {
    state.mode = nextMode;
    const nextProfile =
      nextMode === 'warmup' ? state.warmupProfile ?? state.baseProfile : state.baseProfile;
    profileChanged = applyUnifiedGsplatProfile(runtimeState?.app?.scene?.gsplat, nextProfile);
    state.activeProfile = nextMode;
    if (runtimeState.routeRecord) {
      runtimeState.routeRecord.lodWarmups.push({
        elapsedMs: roundNumber(
          performance.now() - runtimeState.routeRecord.startedPerfTime
        ),
        mode: nextMode,
        pitch: riskSnapshot.pitchDeg,
        distance: riskSnapshot.distance,
        score: riskSnapshot.score
      });
    }
  }

  if (state.warmSecondsRemaining > 0) {
    state.warmSecondsRemaining = Math.max(0, state.warmSecondsRemaining - dt);
  }

  return modeChanged || profileChanged;
}

function isUnifiedLodWarmupActive(runtimeState: any) {
  return (runtimeState?.unifiedLodState?.warmSecondsRemaining ?? 0) > 0;
}

function getUnifiedLodRiskSnapshot(orbit: any) {
  const pitchDeg = Math.abs(Math.round(radToDeg(orbit.currentPitch)));
  const distance = roundNumber(orbit.currentDistance, 3);
  const pitchScore = clamp(
    (lowAnglePrewarmPitchThresholdDeg - pitchDeg) / lowAnglePrewarmPitchThresholdDeg,
    0,
    1
  );
  const distanceScore = clamp(
    (lowAnglePrewarmDistanceThreshold - distance) / lowAnglePrewarmDistanceThreshold,
    0,
    1
  );
  const score = roundNumber(pitchScore * 0.7 + distanceScore * 0.3, 2);

  return {
    pitchDeg,
    distance,
    score,
    shouldPrewarm:
      pitchDeg <= lowAnglePrewarmPitchThresholdDeg &&
      distance <= lowAnglePrewarmDistanceThreshold
  };
}

export {
  createRuntimeUpdateHandler
};
