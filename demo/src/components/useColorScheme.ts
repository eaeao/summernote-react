import { useSyncExternalStore } from 'react';

// Reflect the demo's light/dark theme toggle into the editor. ThemeToggle sets `data-theme` on
// <html>; this hook reads it reactively (via a MutationObserver) so flipping the site theme also
// flips every demo editor's colorScheme.
function subscribe(cb: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => undefined;
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}

function getSnapshot(): 'light' | 'dark' {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}
