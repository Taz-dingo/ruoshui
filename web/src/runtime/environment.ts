interface RuntimeEnvironmentState {
  root: any;
  skyDome: any;
  horizonGlow: any;
}

function createRuntimeEnvironment(pc: any, app: any) {
  const root = new pc.Entity('MemorialEnvironment');

  const skyDome = new pc.Entity('MemorialSkyDome');
  skyDome.addComponent('render', {
    type: 'sphere',
    castShadows: false,
    receiveShadows: false
  });
  skyDome.setLocalScale(52, 52, 52);
  skyDome.render.meshInstances[0].material = createGradientSkyMaterial(pc, app, {
    top: '#3d4f42',
    middle: '#79614d',
    horizon: '#d8c2a1',
    bottom: '#19130f'
  });
  root.addChild(skyDome);

  const horizonGlow = new pc.Entity('MemorialHorizonGlow');
  horizonGlow.addComponent('render', {
    type: 'sphere',
    castShadows: false,
    receiveShadows: false
  });
  horizonGlow.setLocalScale(37, 18, 37);
  horizonGlow.setLocalPosition(0, -5.6, 0);
  horizonGlow.render.meshInstances[0].material = createGradientSkyMaterial(pc, app, {
    top: '#000000',
    middle: '#8ba972',
    horizon: '#f1dcc0',
    bottom: '#000000',
    alphaTop: 0,
    alphaMiddle: 0.18,
    alphaHorizon: 0.34,
    alphaBottom: 0
  });
  root.addChild(horizonGlow);

  app.root.addChild(root);

  return {
    root,
    skyDome,
    horizonGlow
  };
}

function updateRuntimeEnvironment(
  runtimeState: { camera?: any; environment?: RuntimeEnvironmentState | null } | null | undefined
) {
  const camera = runtimeState?.camera;
  const environment = runtimeState?.environment;
  if (!camera || !environment?.root) {
    return;
  }

  environment.root.setPosition(camera.getPosition());
}

function createGradientSkyMaterial(
  pc: any,
  app: any,
  options: {
    top: string;
    middle: string;
    horizon: string;
    bottom: string;
    alphaTop?: number;
    alphaMiddle?: number;
    alphaHorizon?: number;
    alphaBottom?: number;
  }
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建环境贴图画布');
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, withAlpha(options.top, options.alphaTop ?? 1));
  gradient.addColorStop(0.36, withAlpha(options.middle, options.alphaMiddle ?? 1));
  gradient.addColorStop(0.56, withAlpha(options.horizon, options.alphaHorizon ?? 1));
  gradient.addColorStop(1, withAlpha(options.bottom, options.alphaBottom ?? 1));
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new pc.Texture(app.graphicsDevice, {
    width: canvas.width,
    height: canvas.height,
    format: pc.PIXELFORMAT_R8_G8_B8_A8,
    mipmaps: false
  });
  texture.setSource(canvas);
  texture.minFilter = pc.FILTER_LINEAR;
  texture.magFilter = pc.FILTER_LINEAR;
  texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
  texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;

  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.emissiveMap = texture;
  material.emissive.set(1, 1, 1);
  material.opacityMap = texture;
  material.opacityMapChannel = 'a';
  material.blendType = pc.BLEND_NORMAL;
  material.cull = pc.CULLFACE_NONE;
  material.depthWrite = false;
  material.update();

  return material;
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((value) => `${value}${value}`)
          .join('')
      : normalized;

  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}

export {
  createRuntimeEnvironment,
  updateRuntimeEnvironment
};
