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

export async function loadVariantIntoRuntime({
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

  runtimeState.loopController?.wake?.();
  detachVariantFromRuntime(runtimeState);

  const benchmark = timings.benchmark ?? createBenchmark();
  runtimeState.variantId = variant.id;
  runtimeState.variantMeta = variant;
  runtimeState.benchmark = benchmark;
  runtimeState.routePlayback = null;
  runtimeState.routeRecord = null;
  runtimeState.unifiedLodState = null;

  const splatAsset = new pc.Asset(`ruoshui-${variant.id}`, 'gsplat', { url: variant.assetUrl });
  const assetLoadStartedAt = performance.now();

  await new Promise<void>((resolve, reject) => {
    const loader = new pc.AssetListLoader([splatAsset], runtimeState.app.assets);
    const onError = (err: unknown, asset: any) => {
      runtimeState.app.assets.off('error', onError);
      reject(new Error(`加载 ${asset.name} 失败：${String(err)}`));
    };

    runtimeState.app.assets.on('error', onError);
    loader.load(() => {
      runtimeState.app.assets.off('error', onError);
      benchmark.loadMs = performance.now() - assetLoadStartedAt;
      publishVariantBenchmark(variant.id);
      resolve();
    });
  });

  const splat = new pc.Entity('RuoshuiCampus');
  const gsplatComponent: any = {
    asset: splatAsset
  };

  if (variant.unified) {
    gsplatComponent.unified = true;
  }

  if (variant.lodDistances) {
    gsplatComponent.lodDistances = variant.lodDistances;
  }

  splat.addComponent('gsplat', gsplatComponent);
  runtimeState.app.root.addChild(splat);
  runtimeState.splatAsset = splatAsset;
  runtimeState.splatEntity = splat;
  runtimeState.unifiedLodState = configureUnifiedGsplat(runtimeState.app, variant);
  trackFirstFrame(runtimeState.app, variant.id, timings.switchStartedAt);
  runtimeState.requestRender?.();
}

export function detachVariantFromRuntime(runtimeState: any) {
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
