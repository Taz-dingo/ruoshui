import type { CameraViewState } from '../types';

const cameraEventName = 'ruoshui:camera-state';

const emptyCameraState: CameraViewState = {
  summary: '等待视角',
  position: '—',
  target: '—',
  distance: '—',
  angle: '—'
};

let cameraState = emptyCameraState;

export function getCameraState() {
  return cameraState;
}

export function publishCameraState(state: CameraViewState) {
  cameraState = state;
  window.dispatchEvent(new CustomEvent(cameraEventName, { detail: state }));
}

export function subscribeCameraState(listener: (state: CameraViewState) => void) {
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<CameraViewState>).detail);
  };

  window.addEventListener(cameraEventName, handleEvent);
  return () => {
    window.removeEventListener(cameraEventName, handleEvent);
  };
}
