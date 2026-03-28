import type { PresetPanelViewState } from '../types';

const presetPanelEventName = 'ruoshui:preset-panel-state';
export const presetSelectEventName = 'ruoshui:preset-select';

let presetPanelState: PresetPanelViewState | null = null;

export function getPresetPanelState() {
  return presetPanelState;
}

export function publishPresetPanelState(state: PresetPanelViewState) {
  presetPanelState = state;
  window.dispatchEvent(new CustomEvent(presetPanelEventName, { detail: state }));
}

export function subscribePresetPanelState(listener: (state: PresetPanelViewState) => void) {
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<PresetPanelViewState>).detail);
  };

  window.addEventListener(presetPanelEventName, handleEvent);
  return () => {
    window.removeEventListener(presetPanelEventName, handleEvent);
  };
}
