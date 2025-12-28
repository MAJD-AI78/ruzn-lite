import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distance in pixels to trigger refresh
  maxPull?: number; // Maximum pull distance
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    // Only pull down, not up
    if (diff > 0) {
      // Apply resistance - the further you pull, the harder it gets
      const resistance = 0.4;
      const adjustedDiff = Math.min(diff * resistance, maxPull);
      setPullDistance(adjustedDiff);
      
      // Haptic feedback at threshold
      if (adjustedDiff >= threshold && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  }, [isPulling, isRefreshing, maxPull, threshold]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      // Haptic feedback on refresh trigger
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to 0
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);
  
  return {
    pullDistance,
    isRefreshing,
    isPulling,
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
