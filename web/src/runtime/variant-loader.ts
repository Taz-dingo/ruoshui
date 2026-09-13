interface LoadRuntimeVariantArgs {
  pc: any;
  runtimeState: any;
  variant: any;
  timings?: any;
  createBenchmark: () => any;
  publishVariantBenchmark: (variantId: string) => void;
  configureUnifiedGsplat: (app: any, variant: any) => any;
  setStatus?: (title: string, detail: string) => void;
  registerCancel?: (cancel: (() => void) | null) => void;
  trackFirstFrame: (app: any, variantId: string, switchStartedAt: number) => void;
}

async function loadGsplatAsset(
  pc: any,
  runtimeState: any,
  variantId: string,
  url: string,
  registerCancel?: (cancel: (() => void) | null) => void
) {
  const abortController = new AbortController();
  registerCancel?.(() => abortController.abort());
  const response = await fetch(url, { signal: abortController.signal });

  if (!response.ok) {
    throw new Error(`加载模型失败：${response.status} ${response.statusText}`);
  }

  const splatAsset = new pc.Asset(`ruoshui-${variantId}:${url}`, 'gsplat', {
    url,
    contents: response
  });

  await new Promise<void>((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], runtimeState.app.assets);
    const onError = (err: unknown, asset: any) => {
      runtimeState.app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    runtimeState.app.assets.on('error', onError);
    loader.load((err: unknown) => {
      runtimeState.app.assets.off('error', onError);
      if (err) {
        reject(new Error(`加载 ${variantId} 失败：${String(err)}`));
        return;
      }
      resolve();
    });
  });

  registerCancel?.(null);

  return {
    asset: splatAsset
  };
}

function attachLoadedSplat(
  pc: any,
  runtimeState: any,
  loadedSplatAsset: any,
  variant: any,
  configureUnifiedGsplat: (app: any, variant: any) => any
) {
  detachVariantFromRuntime(runtimeState);

  const splat = new pc.Entity('RuoshuiCampus');
  const gsplatComponent: any = {
    asset: loadedSplatAsset.asset
  };

  if (variant.unified) {
    gsplatComponent.unified = true;
  }

  if (variant.lodDistances) {
    gsplatComponent.lodDistances = variant.lodDistances;
  }

  splat.addComponent('gsplat', gsplatComponent);
  runtimeState.app.root.addChild(splat);
  runtimeState.splatAsset = loadedSplatAsset.asset;
  runtimeState.splatEntity = splat;
  configureStreamedSplat(runtimeState, splat, variant);
  runtimeState.unifiedLodState = configureUnifiedGsplat(runtimeState.app, variant);
}

function configureStreamedSplat(runtimeState: any, splat: any, variant: any) {
  runtimeState.releaseStreamingBootstrap?.();
  runtimeState.releaseStreamingBootstrap = null;
  runtimeState.app.scene.gsplat.splatBudget = variant.splatBudget ?? 0;

  if (!variant.streamed) {
    return;
  }

  const gsplat = splat.gsplat;
  const lodLevels = gsplat.resource?.octree?.lodLevels;
  if (!Number.isFinite(lodLevels) || lodLevels < 2) {
    return;
  }

  if (Number.isFinite(variant.lodBaseDistance)) {
    gsplat.lodBaseDistance = variant.lodBaseDistance;
  }
  if (Number.isFinite(variant.lodMultiplier)) {
    gsplat.lodMultiplier = variant.lodMultiplier;
  }

  const coarsestLod = lodLevels - 1;
  gsplat.lodRangeMin = coarsestLod;
  gsplat.lodRangeMax = coarsestLod;

  const onFrameReady = (_camera: any, _layer: any, ready: boolean, loadingCount: number) => {
    if (!ready || loadingCount !== 0) {
      return;
    }

    runtimeState.app.systems.gsplat.off('frame:ready', onFrameReady);
    gsplat.lodRangeMin = 0;
    gsplat.lodRangeMax = coarsestLod;
    runtimeState.requestRender?.();
  };

  runtimeState.app.systems.gsplat.on('frame:ready', onFrameReady);
  runtimeState.releaseStreamingBootstrap = () =>
    runtimeState.app.systems.gsplat.off('frame:ready', onFrameReady);
}

async function loadVariantIntoRuntime({
  pc,
  runtimeState,
  variant,
  timings = {},
  createBenchmark,
  publishVariantBenchmark,
  configureUnifiedGsplat,
  setStatus,
  registerCancel,
  trackFirstFrame
}: LoadRuntimeVariantArgs) {
  if (!runtimeState?.app) {
    throw new Error('运行时尚未初始化');
  }

  const shouldAbort =
    typeof timings.shouldAbort === 'function' ? timings.shouldAbort : () => false;
  const cancelRegistration = registerCancel ?? timings.registerCancel;

  runtimeState.loopController?.wake?.();

  const benchmark = timings.benchmark ?? createBenchmark();
  runtimeState.variantId = variant.id;
  runtimeState.variantMeta = variant;
  runtimeState.benchmark = benchmark;
  runtimeState.routePlayback = null;
  runtimeState.routeRecord = null;
  runtimeState.unifiedLodState = null;

  setStatus?.('加载中', `读取 ${variant.name} 资源`);
  const assetLoadStartedAt = performance.now();
  let loadedSplatAsset: { asset: any };
  try {
    loadedSplatAsset = await loadGsplatAsset(
      pc,
      runtimeState,
      variant.id,
      variant.assetUrl,
      cancelRegistration
    );
  } finally {
    cancelRegistration?.(null);
  }

  if (shouldAbort()) {
    runtimeState.app.assets.remove(loadedSplatAsset.asset);
    loadedSplatAsset.asset.unload?.();
    return;
  }

  setStatus?.('解析中', '整理高斯索引与场景层级');
  attachLoadedSplat(pc, runtimeState, loadedSplatAsset, variant, configureUnifiedGsplat);

  benchmark.loadMs = performance.now() - assetLoadStartedAt;
  publishVariantBenchmark(variant.id);
  setStatus?.('显影中', '把校园细节落到当前视角');
  trackFirstFrame(runtimeState.app, variant.id, timings.switchStartedAt);
  runtimeState.requestRender?.();
}

function detachVariantFromRuntime(runtimeState: any) {
  if (!runtimeState?.app) {
    return;
  }

  runtimeState.releaseStreamingBootstrap?.();
  runtimeState.releaseStreamingBootstrap = null;

  if (runtimeState.splatEntity) {
    runtimeState.splatEntity.destroy();
    runtimeState.splatEntity = null;
  }

  if (runtimeState.splatAsset) {
    runtimeState.splatAsset.unload?.();
    runtimeState.app.assets.remove(runtimeState.splatAsset);
    runtimeState.splatAsset = null;
  }
}

export {
  detachVariantFromRuntime,
  loadVariantIntoRuntime
};
