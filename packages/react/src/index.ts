/**
 * @summernote/react — React bindings for @summernote/core.
 */
export const REACT_BINDINGS_VERSION = '0.0.0';

export { SummernoteEditor } from './SummernoteEditor';
export type { SummernoteEditorProps, SummernoteEditorHandle } from './SummernoteEditor';
export { useSummernote } from './useSummernote';
export type { UseSummernoteResult } from './useSummernote';
export { definePlugin } from './plugin';
export type { SummernotePlugin } from './plugin';
export { helloPlugin } from './plugins/hello';

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
export { ChromeProvider, useChrome, useCommand } from './chrome/ChromeContext';
export type { ChromeValue, ChromeUI, ChromeOptions } from './chrome/ChromeContext';
