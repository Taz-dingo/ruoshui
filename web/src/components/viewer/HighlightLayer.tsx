import { useEffect, useMemo, useState } from 'react';

import type { ViewerHighlight } from '../../content/types';
import {
  requestCaptureHighlightPoint,
  requestPresetSelection
} from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
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
      className={`highlight-layer${highlightAuthoring.isEnabled ? ' is-authoring' : ''}`}
      aria-label="三维点位"
    >
      {highlightAuthoring.isEnabled ? (
        <div
          className="highlight-authoring-capture"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestCaptureHighlightPoint(event.clientX, event.clientY);
          }}
          role="presentation"
        >
          <div className="highlight-authoring-hint">
            点击场景记录近似落点
          </div>
        </div>
      ) : null}

      {highlightAuthoring.isEnabled && highlightAuthoring.previewVisible ? (
        <div
          className="highlight-preview"
          style={{
            transform: `translate3d(${highlightAuthoring.previewLeft}px, ${highlightAuthoring.previewTop}px, 0)`
          }}
        >
          <span className="highlight-preview-dot" aria-hidden="true" />
          <span className="highlight-preview-label">预览点</span>
        </div>
      ) : null}

      {highlightOverlay.items.map((item) => (
        <button
          key={item.id}
          className={`highlight-pin${item.isVisible && !highlightAuthoring.isEnabled ? '' : ' is-hidden'}${item.id === activeHighlightId ? ' is-active' : ''}`}
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
          <span className="highlight-pin-dot" aria-hidden="true" />
          <span className="highlight-pin-label">{item.name}</span>
        </button>
      ))}

      {activeHighlight && !highlightAuthoring.isEnabled ? (
        <aside
          aria-live="polite"
          className="highlight-card panel panel-reveal"
        >
          {activeHighlight.imageUrl ? (
            <img
              className="highlight-card-image"
              src={activeHighlight.imageUrl}
              alt={activeHighlight.imageAlt ?? activeHighlight.title}
            />
          ) : null}
          <Card className="h-full">
            <CardContent className="highlight-card-body">
              <CardHeader className="highlight-card-head">
                <div>
                  <span className="highlight-card-kicker">场景点位</span>
                  <CardTitle>{activeHighlight.title}</CardTitle>
                </div>
                <Button
                  className="highlight-card-close"
                  onClick={() => setActiveHighlightId(null)}
                  aria-label="关闭点位卡片"
                  variant="ghost"
                >
                  ×
                </Button>
              </CardHeader>
              <CardDescription>{activeHighlight.body}</CardDescription>
              <CardFooter className="highlight-card-actions">
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
