const stableFrames = 4;
const calibrationFrames = 8;

export type PresenceState = {
  phase: "calibrating" | "ready" | "steady" | "remove";
  reference: Uint8ClampedArray | null;
  previous: Uint8ClampedArray | null;
  count: number;
};

export function startPresence(): PresenceState {
  return { phase: "calibrating", reference: null, previous: null, count: 0 };
}

function changedFraction(frame: Uint8ClampedArray, baseline: Uint8ClampedArray) {
  let changed = 0;
  for (let i = 0; i < frame.length; i += 4) {
    const difference = Math.abs(frame[i] - baseline[i])
      + Math.abs(frame[i + 1] - baseline[i + 1])
      + Math.abs(frame[i + 2] - baseline[i + 2]);
    if (difference >= 72) changed++;
  }
  return changed / (frame.length / 4);
}

export function observePresence(state: PresenceState, frame: Uint8ClampedArray) {
  const still = state.previous !== null && changedFraction(frame, state.previous) < 0.04;
  const next = { ...state, previous: frame };
  if (state.phase === "calibrating" || state.reference === null) {
    next.count = still ? state.count + 1 : 1;
    if (next.count >= calibrationFrames) {
      next.phase = "ready";
      next.reference = frame;
      next.count = 0;
    }
    return { state: next, scan: false };
  }

  const difference = changedFraction(frame, state.reference);
  if (state.phase === "remove") {
    next.count = difference < 0.07 ? state.count + 1 : 0;
    if (next.count >= stableFrames) {
      next.phase = "ready";
      next.count = 0;
    }
    return { state: next, scan: false };
  }

  if (difference < 0.14) {
    next.phase = "ready";
    next.count = 0;
    return { state: next, scan: false };
  }

  next.phase = "steady";
  next.count = still ? state.count + 1 : 1;
  if (next.count < stableFrames) return { state: next, scan: false };
  next.phase = "remove";
  next.count = 0;
  return { state: next, scan: true };
}
