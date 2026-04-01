interface RuntimeEnvironmentState {
  root: any;
  skyDome: any;
  texture: any;
}

async function createRuntimeEnvironment(pc: any, app: any) {
  const root = new pc.Entity('MemorialEnvironment');
  const texture = await loadSkyTexture(
    pc,
    app,
    '/images/sky/qwantani-morning-puresky-original.jpg'
  );

  const skyDome = new pc.Entity('MemorialSkyDome');
  skyDome.addComponent('render', {
    type: 'sphere',
    castShadows: false,
    receiveShadows: false,
    layers: [pc.LAYERID_SKYBOX]
  });
  skyDome.setLocalScale(52, 52, 52);
  skyDome.render.meshInstances[0].material = createSkyMaterial(pc, texture);
  root.addChild(skyDome);

  app.root.addChild(root);

  return {
    root,
    skyDome,
    texture
  };
}

function updateRuntimeEnvironment(
  runtimeState:
    | { camera?: any; environment?: RuntimeEnvironmentState | null }
    | null
    | undefined
) {
  const camera = runtimeState?.camera;
  const environment = runtimeState?.environment;
  if (!camera || !environment?.root) {
    return;
  }

  environment.root.setPosition(camera.getPosition());
}

function destroyRuntimeEnvironment(
  environment: RuntimeEnvironmentState | null | undefined
) {
  if (!environment) {
    return;
  }

  environment.root?.destroy?.();
  environment.texture?.destroy?.();
}

async function loadSkyTexture(pc: any, app: any, url: string) {
  const image = await loadImage(url);
  const texture = new pc.Texture(app.graphicsDevice, {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    format: pc.PIXELFORMAT_R8_G8_B8_A8,
    mipmaps: false
  });

  texture.setSource(image);
  texture.minFilter = pc.FILTER_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.addressU = pc.ADDRESS_WRAP;
  texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;

  return texture;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load sky texture: ${url}`));
    image.src = url;
  });
}

function createSkyMaterial(pc: any, texture: any) {
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.emissive.set(1, 1, 1);
  material.emissiveMap = texture;
  material.emissiveMapTiling.set(-1, 1);
  material.emissiveMapOffset.set(1, 0);
  material.cull = pc.CULLFACE_NONE;
  material.depthWrite = false;
  material.depthTest = true;
  material.update();

  return material;
}

export {
  createRuntimeEnvironment,
  destroyRuntimeEnvironment,
  updateRuntimeEnvironment
};
