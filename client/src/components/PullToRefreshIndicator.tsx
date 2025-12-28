import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
  language: "arabic" | "english";
}

export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold,
  language
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;
  
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const opacity = Math.min(progress * 1.5, 1);
  
  const text = {
    arabic: {
      pull: "اسحب للتحديث",
      release: "أفلت للتحديث",
      refreshing: "جاري التحديث..."
    },
    english: {
      pull: "Pull to refresh",
      release: "Release to refresh",
      refreshing: "Refreshing..."
    }
  };
  
  const t = text[language];
  
  return (
    <div 
      className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground transition-all"
      style={{ 
        height: `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px`,
        opacity: isRefreshing ? 1 : opacity
      }}
    >
      {isRefreshing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>{t.refreshing}</span>
        </>
      ) : (
        <>
          <ArrowDown 
            className="w-4 h-4 text-primary transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <span>{progress >= 1 ? t.release : t.pull}</span>
        </>
      )}
    </div>
  );
}
