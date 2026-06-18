import { createContext, useContext } from 'react';
import type { CommandName, EditorCore, EditorState, Lang, defaultOptions } from '@engine';

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

/**
 * Image-upload hook. Called once per picked file instead of the editor embedding it as a base64 data
 * URL. Upload the file however you like (your server, S3, …) and return — or resolve to — the image
 * `src` to insert (a hosted URL, or a base64 data URL). While the promise is pending the editor shows
 * a loading spinner in place; on rejection the placeholder is removed. Without a handler, files are
 * embedded as base64.
 */
export type ImageUploadHandler = (file: File) => string | Promise<string>;

/** everything the chrome components need, provided once at the editor root (no prop drilling). */
export interface ChromeValue {
  readonly core: EditorCore | null;
  readonly state: EditorState;
  readonly lang: Lang;
  readonly options: ChromeOptions;
  /** dialog/view-toggle handlers (each method is optional). */
  readonly ui: Partial<ChromeUI>;
  /** true while the codeview textarea is showing — the toolbar disables (except codeview). */
  readonly codeviewActive: boolean;
  /** optional image-upload hook — when set, picked files go here instead of being embedded base64. */
  readonly onImageUpload?: ImageUploadHandler;
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
export function useCommand(): (name: CommandName | (string & {}), ...args: unknown[]) => void {
  const { core } = useChrome();
  return (name, ...args) => {
    core?.command(name, ...args);
  };
}
