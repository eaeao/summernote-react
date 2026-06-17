import type { FC } from 'react';
import type { EditorCore } from '@summernote/core';

/**
 * A summernote-react plugin. Plugins register per-instance commands on the EditorCore and/or
 * custom toolbar buttons (referenced by name in the toolbar config). The React equivalent of the
 * legacy UMD `$.extend($.summernote.plugins, ...)` API — typed and per-instance, no globals.
 */
export interface SummernotePlugin {
  readonly name: string;
  /** per-instance commands registered via core.registerCommand. */
  readonly commands?: Record<string, (core: EditorCore, ...args: unknown[]) => boolean>;
  /** custom toolbar buttons keyed by the name used in the toolbar config; each is a component
   * that may use useChrome()/useCommand(). */
  readonly buttons?: Record<string, FC>;
}

/** identity helper for authoring a typed plugin. */
export function definePlugin(plugin: SummernotePlugin): SummernotePlugin {
  return plugin;
}
