interface RuntimeEnvironmentState {
  app: any;
  sourceTexture: any;
  skyboxTexture: any;
}

async function createRuntimeEnvironment(pc: any, app: any) {
  const sourceTexture = await loadEquirectTexture(
    pc,
    app,
    '/images/sky/qwantani-morning-puresky-original.jpg'
  );
  const skyboxTexture = createSkyboxTexture(pc, app, 1024);

  pc.reprojectTexture(sourceTexture, skyboxTexture, {
    numSamples: 1024,
    seamPixels: 1
  });

  app.scene.sky.type = pc.SKYTYPE_INFINITE;
  app.scene.skyboxMip = 0;
  app.scene.setSkybox([
    skyboxTexture,
    null,
    null,
    null,
    null,
    null,
    null
  ]);

  return {
    app,
    sourceTexture,
    skyboxTexture
  };
}

function updateRuntimeEnvironment(_runtimeState?: unknown) {
  return;
}

function destroyRuntimeEnvironment(
  environment: RuntimeEnvironmentState | null | undefined
) {
  if (!environment) {
    return;
  }

  if (environment.app?.scene?.skybox === environment.skyboxTexture) {
    environment.app.scene.setSkybox();
  }

  environment.skyboxTexture?.destroy?.();
  environment.sourceTexture?.destroy?.();
}

async function loadEquirectTexture(pc: any, app: any, url: string) {
  const image = await loadImage(url);
  const texture = new pc.Texture(app.graphicsDevice, {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    format: pc.PIXELFORMAT_R8_G8_B8_A8,
    mipmaps: false
  });

  texture.setSource(image);
  texture.projection = pc.TEXTUREPROJECTION_EQUIRECT;
  texture.minFilter = pc.FILTER_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
  texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;

  return texture;
}

function createSkyboxTexture(pc: any, app: any, size: number) {
  return new pc.Texture(app.graphicsDevice, {
    cubemap: true,
    width: size,
    height: size,
    format: pc.PIXELFORMAT_R8_G8_B8_A8,
    mipmaps: false
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load sky texture: ${url}`));
    image.src = url;
  });
}

export {
  createRuntimeEnvironment,
  destroyRuntimeEnvironment,
  updateRuntimeEnvironment
};
