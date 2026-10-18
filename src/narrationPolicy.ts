/**
 * Continuous narration policy for live camera detections.
 *
 * Repeating every frame is distracting and would drown out voice commands.
 * Narrate a stable new scene periodically and occasionally recap an unchanged
 * scene; never claim that a scene is clear just because no objects were found.
 */
export type NarrationDecision = {
  enabled: boolean;
  speaking: boolean;
  hasCamera: boolean;
  visible: boolean;
  hasStableScene: boolean;
  now: number;
  lastSpokenAt: number;
  sceneSignature: string;
  lastSpokenSignature: string;
  isRecognizedScene: boolean;
};

export function shouldNarrateScene(value: NarrationDecision): boolean {
  if (!value.enabled || value.speaking || !value.hasCamera ||
      !value.visible || !value.hasStableScene) return false;
  // Start once the model has identified a stable scene after user consent.
  if (!value.lastSpokenAt) return true;
  const elapsed = value.now - value.lastSpokenAt;
  if (elapsed < 0) return false;
  const changed = value.sceneSignature !== value.lastSpokenSignature;
  // Announce a meaningful change soon, without constantly interrupting.
  if (changed) return elapsed >= 9000;
  // A stationary scene is described occasionally, not every frame.
  return elapsed >= (value.isRecognizedScene ? 35000 : 55000);
}
