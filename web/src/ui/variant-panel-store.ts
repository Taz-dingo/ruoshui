import type { VariantPanelViewState } from '../types';

const variantPanelEventName = 'ruoshui:variant-panel-state';
export const variantSelectEventName = 'ruoshui:variant-select';

let variantPanelState: VariantPanelViewState | null = null;

export function getVariantPanelState() {
  return variantPanelState;
}

export function publishVariantPanelState(state: VariantPanelViewState) {
  variantPanelState = state;
  window.dispatchEvent(new CustomEvent(variantPanelEventName, { detail: state }));
}

export function subscribeVariantPanelState(listener: (state: VariantPanelViewState) => void) {
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<VariantPanelViewState>).detail);
  };

  window.addEventListener(variantPanelEventName, handleEvent);
  return () => {
    window.removeEventListener(variantPanelEventName, handleEvent);
  };
}
