import { useEffect, useMemo, useState } from 'react';

import type { ViewerHighlight } from '../../content/types';
import {
  requestCaptureHighlightPoint,
  requestPresetSelection
} from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { cn } from '../../utils/cn';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface HighlightLayerProps {
  highlights: ViewerHighlight[];
}

function HighlightLayer({ highlights }: HighlightLayerProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const highlightAuthoring = useViewerUiStore((store) => store.highlightAuthoring);
  const highlightOverlay = useViewerUiStore((store) => store.highlightOverlay);

  const highlightMap = useMemo(
    () => new Map(highlights.map((highlight) => [highlight.id, highlight])),
    [highlights]
  );
  const activeHighlight = activeHighlightId
    ? highlightMap.get(activeHighlightId) ?? null
    : null;

  useEffect(() => {
    if (activeHighlightId && !highlightMap.has(activeHighlightId)) {
      setActiveHighlightId(null);
    }
  }, [activeHighlightId, highlightMap, highlights]);

  if (highlights.length === 0 && !highlightAuthoring.isEnabled && !activeHighlight) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-[2] pointer-events-none',
        highlightAuthoring.isEnabled && 'pointer-events-auto'
      )}
      aria-label="三维点位"
    >
      {highlightAuthoring.isEnabled ? (
        <div
          className="absolute inset-0 cursor-crosshair pointer-events-auto"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestCaptureHighlightPoint(event.clientX, event.clientY);
          }}
          role="presentation"
        >
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-brand/26 bg-surface/78 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-ink/92 backdrop-blur-[12px]">
            点击场景记录近似落点
          </div>
        </div>
      ) : null}

      {highlightAuthoring.isEnabled && highlightAuthoring.previewVisible ? (
        <div
          className="pointer-events-none absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-brand-strong/38 bg-[rgba(35,52,24,0.72)] px-2.5 py-1.5 text-ink/96 backdrop-blur-[12px]"
          style={{
            transform: `translate3d(${highlightAuthoring.previewLeft}px, ${highlightAuthoring.previewTop}px, 0)`
          }}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d7efad] shadow-[0_0_0_6px_rgba(199,227,158,0.16)]" aria-hidden="true" />
          <span className="text-[11px] font-semibold">预览点</span>
        </div>
      ) : null}

      {highlightOverlay.items.map((item) => (
        <button
          key={item.id}
          className={cn(
            'pointer-events-auto absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-outline/18 bg-[rgba(37,28,23,0.22)] px-2.5 py-1.5 text-left text-ink transition-[opacity,background-color,border-color,backdrop-filter] duration-180 ease-out backdrop-blur-[0px] hover:border-brand/42 hover:bg-surface/76 hover:backdrop-blur-[12px] focus-visible:border-brand/42 focus-visible:bg-surface/76 focus-visible:backdrop-blur-[12px]',
            item.id === activeHighlightId && 'border-brand/42 bg-surface/76 backdrop-blur-[12px]',
            (!item.isVisible || highlightAuthoring.isEnabled) && 'pointer-events-none opacity-0'
          )}
          type="button"
          style={{
            transform: `translate3d(${item.left}px, ${item.top}px, 0)`
          }}
          onClick={() => {
            setActiveHighlightId(item.id);
            const highlight = highlightMap.get(item.id);
            if (highlight?.presetId) {
              requestPresetSelection(highlight.presetId);
            }
          }}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand shadow-[0_0_0_6px_rgba(168,201,125,0.12)]" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-ink/94">{item.name}</span>
        </button>
      ))}

      {activeHighlight && !highlightAuthoring.isEnabled ? (
        <aside
          aria-live="polite"
          className="pointer-events-auto absolute bottom-4 left-1/2 z-[4] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden max-[760px]:bottom-[calc(4.85rem+var(--safe-bottom))] max-[760px]:w-[calc(100vw-1.5rem)]"
        >
          {activeHighlight.imageUrl ? (
            <img
              className="block h-44 w-full object-cover bg-ink/6"
              src={activeHighlight.imageUrl}
              alt={activeHighlight.imageAlt ?? activeHighlight.title}
            />
          ) : null}
          <Card className="h-full">
            <CardContent className="grid gap-3 p-4">
              <CardHeader className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-brand-strong/78">场景点位</span>
                  <CardTitle>{activeHighlight.title}</CardTitle>
                </div>
                <Button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-transparent text-[20px] leading-none text-ink-muted/72 transition-colors duration-180 ease-out hover:border-outline/16 hover:bg-ink/4 hover:text-ink"
                  onClick={() => setActiveHighlightId(null)}
                  aria-label="关闭点位卡片"
                  variant="ghost"
                >
                  ×
                </Button>
              </CardHeader>
              <CardDescription>{activeHighlight.body}</CardDescription>
              <CardFooter className="flex justify-start">
                <Button
                  onClick={() => requestPresetSelection(activeHighlight.presetId)}
                  variant="tertiary"
                >
                  飞到这里
                </Button>
              </CardFooter>
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}

export {
  HighlightLayer
};
