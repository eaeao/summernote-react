import { createContext, useContext } from 'react';
import type { EditorCore, EditorState, Lang, defaultOptions } from '@summernote/core';

export type ChromeOptions = typeof defaultOptions;

/** imperative chrome actions (dialogs / view toggles) provided by the editor root. */
export interface ChromeUI {
  openLinkDialog(): void;
  openImageDialog(): void;
  openVideoDialog(): void;
  openHelpDialog(): void;
  toggleFullscreen(): void;
  toggleCodeview(): void;
}

/** everything the chrome components need, provided once at the editor root (no prop drilling). */
export interface ChromeValue {
  readonly core: EditorCore | null;
  readonly state: EditorState;
  readonly lang: Lang;
  readonly options: ChromeOptions;
  /** dialog/view-toggle handlers; partial while those tracks land. */
  readonly ui: Partial<ChromeUI>;
  /** true while the codeview textarea is showing — the toolbar disables (except codeview). */
  readonly codeviewActive: boolean;
}

const ChromeContext = createContext<ChromeValue | null>(null);

export const ChromeProvider = ChromeContext.Provider;

export function useChrome(): ChromeValue {
  const value = useContext(ChromeContext);
  if (!value) {
    throw new Error('summernote chrome components must be rendered inside <SummernoteEditor>');
  }
  return value;
}

/** dispatch a command, keeping the editable selection (toolbar mousedown must not blur it). */
export function useCommand(): (name: string, ...args: unknown[]) => void {
  const { core } = useChrome();
  return (name, ...args) => {
    core?.command(name, ...args);
  };
}
