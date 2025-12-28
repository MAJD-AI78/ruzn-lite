import { useCallback } from "react";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 5,
  medium: 10,
  heavy: 20,
  success: [10, 30, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30]
};

export function useHapticFeedback() {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;
  
  const trigger = useCallback((type: HapticType = "light") => {
    if (!isSupported) return false;
    
    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);
  
  const triggerLight = useCallback(() => trigger("light"), [trigger]);
  const triggerMedium = useCallback(() => trigger("medium"), [trigger]);
  const triggerHeavy = useCallback(() => trigger("heavy"), [trigger]);
  const triggerSuccess = useCallback(() => trigger("success"), [trigger]);
  const triggerWarning = useCallback(() => trigger("warning"), [trigger]);
  const triggerError = useCallback(() => trigger("error"), [trigger]);
  
  return {
    isSupported,
    trigger,
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSuccess,
    triggerWarning,
    triggerError
  };
}
