import { useEffect, useMemo, useRef, useState } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

type LoadPhase =
  | 'idle'
  | 'booting'
  | 'downloading'
  | 'first-frame'
  | 'ready'
  | 'error';

interface ProgressState {
  label: string;
  phase: LoadPhase;
  percent: number;
}

const sourceOptions = {
  ksplat: {
    assetPath: '/models/hhuc-progressive.ksplat',
    format: GaussianSplats3D.SceneFormat.KSplat,
    label: 'KSPLAT progressive',
    note: '由 SOG -> PLY -> KSPLAT 串联得到，目标是进一步压缩下载与首段到达时间。',
  },
  ply: {
    assetPath: '/models/hhuc-progressive.ply',
    format: GaussianSplats3D.SceneFormat.Ply,
    label: 'PLY progressive',
    note: '由 SOG 直接解码还原出的 PLY，保留作真实 progressive baseline。',
  },
} as const;

type ProgressiveSourceId = keyof typeof sourceOptions;

function ProgressiveApp() {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<GaussianSplats3D.Viewer | null>(null);
  const [sourceId, setSourceId] = useState<ProgressiveSourceId>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('source') === 'ply' ? 'ply' : 'ksplat';
  });
  const [progress, setProgress] = useState<ProgressState>({
    label: '准备启动 progressive runtime…',
    phase: 'idle',
    percent: 0,
  });
  const [cameraText, setCameraText] = useState('等待首帧…');
  const sourceConfig = sourceOptions[sourceId];
  const [stats] = useState({
    splats: '1,868,855',
    mode: 'GaussianSplats3D progressiveLoad',
  });

  const progressPercent = useMemo(
    () => `${Math.max(0, Math.min(100, progress.percent)).toFixed(1)}%`,
    [progress.percent],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('source', sourceId);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  }, [sourceId]);

  useEffect(() => {
    const host = sceneHostRef.current;

    if (!host) {
      return undefined;
    }

    let cancelled = false;
    let cameraFrame = 0;

    async function boot() {
      setProgress({
        label: '创建 GaussianSplats3D viewer…',
        phase: 'booting',
        percent: 0,
      });

      const viewer = new GaussianSplats3D.Viewer({
        rootElement: host,
        selfDrivenMode: true,
        useBuiltInControls: true,
        renderMode: GaussianSplats3D.RenderMode.OnChange,
        sceneRevealMode: GaussianSplats3D.SceneRevealMode.Default,
        ignoreDevicePixelRatio: true,
        sharedMemoryForWorkers: false,
        gpuAcceleratedSort: false,
        sphericalHarmonicsDegree: 2,
        optimizeSplatData: false,
        inMemoryCompressionLevel: 0,
        freeIntermediateSplatData: true,
        cameraUp: [0, 1, 0],
        initialCameraPosition: [0.18, 2.68, 0.54],
        initialCameraLookAt: [0, -0.12, 0.02],
      });

      viewerRef.current = viewer;
      viewer.start();

      const updateCameraText = () => {
        if (cancelled || viewerRef.current !== viewer) {
          return;
        }

        const camera = viewer.camera;
        if (camera?.position) {
          const target = viewer.controls?.target;
          const positionText = [camera.position.x, camera.position.y, camera.position.z]
            .map((value) => value.toFixed(2))
            .join(', ');
          const targetText = target
            ? [target.x, target.y, target.z].map((value) => value.toFixed(2)).join(', ')
            : '—';

          setCameraText(`position ${positionText} · target ${targetText}`);
        }

        cameraFrame = window.requestAnimationFrame(updateCameraText);
      };

      cameraFrame = window.requestAnimationFrame(updateCameraText);

      try {
        await viewer.addSplatScene(sourceConfig.assetPath, {
          progressiveLoad: true,
          showLoadingUI: false,
          format: sourceConfig.format,
          onProgress: (percent: number, label: string, status: number) => {
            if (cancelled) {
              return;
            }

            const nextPhase =
              percent >= 100
                ? 'first-frame'
                : status === 0
                  ? 'downloading'
                  : 'booting';

            setProgress({
              label: label ? `加载中 · ${label}` : '加载中…',
              phase: nextPhase,
              percent,
            });
          },
        });

        if (cancelled) {
          return;
        }

        setProgress({
          label: '首批 splats 已到达，可继续边看边下。',
          phase: 'first-frame',
          percent: 100,
        });

        window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setProgress({
            label: 'progressive runtime 已就绪，可直接体感验证。',
            phase: 'ready',
            percent: 100,
          });
        }, 300);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setProgress({
          label:
            error instanceof Error
              ? `加载失败：${error.message}`
              : '加载失败：未知错误',
          phase: 'error',
          percent: 0,
        });
      }
    }

    boot();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(cameraFrame);
      const viewer = viewerRef.current;
      viewerRef.current = null;
      viewer?.stop?.();
      viewer?.dispose?.();
    };
  }, [sourceConfig]);

  return (
    <main className="shell progressive-shell">
      <div className="scene progressive-scene" ref={sceneHostRef} />

      <section className="progressive-overlay">
        <div className="panel progressive-card">
          <div className="progressive-head">
            <div>
              <p className="progressive-kicker">Progressive Runtime Spike</p>
              <h1>若水广场 · GaussianSplats3D</h1>
            </div>
            <a className="button secondary" href="/">
              返回主 viewer
            </a>
          </div>

          <p className="progressive-summary">
            这页只验证一件事：把从 `SOG` 转出的 `PLY` 交给真正支持
            `progressiveLoad` 的 runtime，体感是否更接近“边下边长出来”。现在可以直接对比
            `PLY` baseline 和压缩后的 `KSPLAT`。
          </p>

          <div className="progressive-switches">
            <button
              className={`button ${sourceId === 'ksplat' ? 'primary' : 'secondary'}`}
              onClick={() => setSourceId('ksplat')}
              type="button"
            >
              KSPLAT
            </button>
            <button
              className={`button ${sourceId === 'ply' ? 'primary' : 'secondary'}`}
              onClick={() => setSourceId('ply')}
              type="button"
            >
              PLY
            </button>
          </div>

          <div className="progressive-grid">
            <div className="progressive-metric">
              <span>状态</span>
              <strong>{progress.label}</strong>
            </div>
            <div className="progressive-metric">
              <span>进度</span>
              <strong>{progressPercent}</strong>
            </div>
            <div className="progressive-metric">
              <span>模式</span>
              <strong>{stats.mode}</strong>
            </div>
            <div className="progressive-metric">
              <span>格式</span>
              <strong>{sourceConfig.label}</strong>
            </div>
          </div>

          <div className="progressive-bar" aria-hidden="true">
            <span style={{ width: progressPercent }} />
          </div>

          <div className="progressive-foot">
            <span>模型 {sourceConfig.assetPath}</span>
            <span>{stats.splats} splats</span>
            <span>{sourceConfig.note}</span>
            <span>{cameraText}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export {
  ProgressiveApp
};
