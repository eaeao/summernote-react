/**
 * Headless, framework-agnostic editor engine.
 */
// synced from package.json by scripts/sync-version.mjs (enforced by scripts/check-version.mjs).
export const CORE_VERSION: string = '1.4.1';

export { EditorCore, createEditorCore } from './EditorCore';
export type { EditorState, EditorCoreOptions, EditorAlign, CommandName } from './EditorCore';

export { defaultOptions } from './options';
export type { ToolbarGroup, PopoverConfig, KeyMap, Icons } from './options';

export { langEnUS, resolveLang } from './lang/en-US';
export type { Lang, LangPartial } from './lang/en-US';
export { locales, localeCodes } from './lang/locales';

export { default as env } from './core/env';
export { detectEnv } from './core/env';
export type { EnvFlags } from './core/env';

export { createVideoNode } from './media/video';

export { purifyCodeview, isSafeLinkUrl, defaultCodeviewFilter } from './security/purify';
export type { CodeviewFilterOptions } from './security/purify';
