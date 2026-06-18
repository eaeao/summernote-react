/**
 * summernote-react — the React + TS summernote port (engine + React bindings in one package).
 */
// synced from package.json by scripts/sync-version.mjs (enforced by scripts/check-version.mjs).
export const VERSION: string = '1.2.0';

// the headless engine API is part of this single package
export * from './engine';

export { SummernoteEditor } from './SummernoteEditor';
export type { SummernoteEditorProps, SummernoteEditorHandle } from './SummernoteEditor';
export type ThemeName = 'lite' | 'bs3' | 'bs4' | 'bs5';
export { useSummernote } from './useSummernote';
export type { UseSummernoteResult } from './useSummernote';
export { definePlugin } from './plugin';
export type { SummernotePlugin } from './plugin';
export { helloPlugin } from './plugins/hello';
export { specialcharsPlugin } from './plugins/specialchars';
export { databasicPlugin } from './plugins/databasic';

export { Toolbar } from './toolbar/Toolbar';
export type { ToolbarProps } from './toolbar/Toolbar';
export { ToolbarItem, isKnownItem } from './toolbar/registry';

export { Dropdown } from './chrome/Dropdown';
export type { DropdownProps } from './chrome/Dropdown';
export { Modal } from './chrome/Modal';
export type { ModalProps } from './chrome/Modal';
export { LinkDialog, ImageDialog, VideoDialog, HelpDialog } from './chrome/dialogs';
export type { DialogProps } from './chrome/dialogs';
export { Statusbar } from './chrome/Statusbar';
export type { StatusbarProps } from './chrome/Statusbar';
export { Codeview } from './chrome/Codeview';
export { Placeholder } from './chrome/Placeholder';
export { Popover } from './chrome/Popover';
export type { PopoverProps } from './chrome/Popover';
export { LinkPopover, TablePopover, ImagePopover } from './chrome/popovers';
export { Handle } from './chrome/Handle';
export { PopoverHost } from './chrome/PopoverHost';
export { AirPopover } from './chrome/AirPopover';
export { AirPopoverHost } from './chrome/AirPopoverHost';
export { ChromeProvider, useChrome, useCommand } from './chrome/ChromeContext';
export type { ChromeValue, ChromeUI, ChromeOptions, ImageUploadHandler } from './chrome/ChromeContext';
