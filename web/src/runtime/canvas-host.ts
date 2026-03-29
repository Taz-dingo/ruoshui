function createSceneCanvas(sceneContainer: HTMLElement) {
  sceneContainer.replaceChildren();

  const canvas = document.createElement('canvas');
  const rect = sceneContainer.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  sceneContainer.append(canvas);

  return canvas;
}

export {
  createSceneCanvas
};
