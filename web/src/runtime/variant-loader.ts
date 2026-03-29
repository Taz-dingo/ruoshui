interface LoadRuntimeVariantArgs {
  pc: any;
  runtimeState: any;
  variant: any;
  timings?: any;
  createBenchmark: () => any;
  publishVariantBenchmark: (variantId: string) => void;
  configureUnifiedGsplat: (app: any, variant: any) => any;
  trackFirstFrame: (app: any, variantId: string, switchStartedAt: number) => void;
}

async function loadGsplatAsset(pc: any, runtimeState: any, variantId: string, url: string) {
  const splatAsset = new pc.Asset(`ruoshui-${variantId}:${url}`, 'gsplat', { url });

  await new Promise<void>((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], runtimeState.app.assets);
    const onError = (err: unknown, asset: any) => {
      runtimeState.app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    runtimeState.app.assets.on('error', onError);
    loader.load(() => {
      runtimeState.app.assets.off('error', onError);
      resolve();
    });
  });

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
  runtimeState.unifiedLodState = configureUnifiedGsplat(runtimeState.app, variant);
}

async function loadVariantIntoRuntime({
  pc,
  runtimeState,
  variant,
  timings = {},
  createBenchmark,
  publishVariantBenchmark,
  configureUnifiedGsplat,
  trackFirstFrame
}: LoadRuntimeVariantArgs) {
  if (!runtimeState?.app) {
    throw new Error('运行时尚未初始化');
  }

  const shouldAbort =
    typeof timings.shouldAbort === 'function' ? timings.shouldAbort : () => false;

  runtimeState.loopController?.wake?.();

  const benchmark = timings.benchmark ?? createBenchmark();
  runtimeState.variantId = variant.id;
  runtimeState.variantMeta = variant;
  runtimeState.benchmark = benchmark;
  runtimeState.routePlayback = null;
  runtimeState.routeRecord = null;
  runtimeState.unifiedLodState = null;

  const assetLoadStartedAt = performance.now();
  const loadedSplatAsset = await loadGsplatAsset(pc, runtimeState, variant.id, variant.assetUrl);

  if (shouldAbort()) {
    runtimeState.app.assets.remove(loadedSplatAsset.asset);
    loadedSplatAsset.asset.unload?.();
    return;
  }

  attachLoadedSplat(pc, runtimeState, loadedSplatAsset, variant, configureUnifiedGsplat);

  benchmark.loadMs = performance.now() - assetLoadStartedAt;
  publishVariantBenchmark(variant.id);
  trackFirstFrame(runtimeState.app, variant.id, timings.switchStartedAt);
  runtimeState.requestRender?.();
}

function detachVariantFromRuntime(runtimeState: any) {
  if (!runtimeState?.app) {
    return;
  }

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
