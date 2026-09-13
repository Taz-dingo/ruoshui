import type { UnifiedGsplatProfile } from '../content/types';

function normalizeUnifiedGsplatProfile(profile: UnifiedGsplatProfile | undefined) {
  return {
    lodUnderfillLimit: Number.isFinite(profile?.lodUnderfillLimit)
      ? profile.lodUnderfillLimit
      : undefined,
    cooldownTicks: Number.isFinite(profile?.cooldownTicks)
      ? profile.cooldownTicks
      : undefined,
    lodUpdateDistance: Number.isFinite(profile?.lodUpdateDistance)
      ? profile.lodUpdateDistance
      : undefined,
    lodUpdateAngle: Number.isFinite(profile?.lodUpdateAngle)
      ? profile.lodUpdateAngle
      : undefined,
    lodBehindPenalty: Number.isFinite(profile?.lodBehindPenalty)
      ? profile.lodBehindPenalty
      : undefined
  };
}

function deriveWarmupUnifiedGsplatProfile(baseProfile: UnifiedGsplatProfile) {
  return {
    lodUnderfillLimit: Number.isFinite(baseProfile?.lodUnderfillLimit)
      ? Math.max(0, Math.round(baseProfile.lodUnderfillLimit) - 1)
      : 0,
    cooldownTicks: Number.isFinite(baseProfile?.cooldownTicks)
      ? Math.max(12, Math.round(baseProfile.cooldownTicks * 0.12))
      : 24,
    lodUpdateDistance: Number.isFinite(baseProfile?.lodUpdateDistance)
      ? Math.max(0.2, Number((baseProfile.lodUpdateDistance * 0.35).toFixed(3)))
      : 0.35,
    lodUpdateAngle: Number.isFinite(baseProfile?.lodUpdateAngle)
      ? Math.max(1, Number((baseProfile.lodUpdateAngle * 0.35).toFixed(3)))
      : 1.5,
    lodBehindPenalty: Number.isFinite(baseProfile?.lodBehindPenalty)
      ? Math.max(0.75, Number((baseProfile.lodBehindPenalty * 0.6).toFixed(3)))
      : 1
  };
}

function applyUnifiedGsplatProfile(sceneGsplat: any, profile: UnifiedGsplatProfile) {
  if (!sceneGsplat || !profile) {
    return false;
  }

  let changed = false;
  for (const [key, value] of Object.entries(profile)) {
    if (!Number.isFinite(value) || sceneGsplat[key] === value) {
      continue;
    }

    sceneGsplat[key] = value;
    changed = true;
  }

  return changed;
}

export {
  applyUnifiedGsplatProfile,
  deriveWarmupUnifiedGsplatProfile,
  normalizeUnifiedGsplatProfile
};
