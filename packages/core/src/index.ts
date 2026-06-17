/**
 * @summernote/core — headless, framework-agnostic editor engine.
 */
export const CORE_VERSION = '0.0.0';

export { EditorCore, createEditorCore } from './EditorCore';
export type { EditorState, EditorCoreOptions, EditorAlign } from './EditorCore';

export { defaultOptions } from './options';
export type { ToolbarGroup, PopoverConfig, KeyMap, Icons } from './options';

export { langEnUS } from './lang/en-US';
export type { Lang } from './lang/en-US';

export { default as env } from './core/env';
export { detectEnv } from './core/env';
export type { EnvFlags } from './core/env';

export { createVideoNode } from './media/video';
