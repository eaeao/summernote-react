/**
 * @summernote/react — React bindings for @summernote/core.
 */
export const REACT_BINDINGS_VERSION = '0.0.0';

export { SummernoteEditor } from './SummernoteEditor';
export type { SummernoteEditorProps } from './SummernoteEditor';
export { useSummernote } from './useSummernote';
export type { UseSummernoteResult } from './useSummernote';

export { Toolbar } from './toolbar/Toolbar';
export type { ToolbarProps } from './toolbar/Toolbar';
export { ToolbarItem, isKnownItem } from './toolbar/registry';

export { Dropdown } from './chrome/Dropdown';
export type { DropdownProps } from './chrome/Dropdown';
export { Modal } from './chrome/Modal';
export type { ModalProps } from './chrome/Modal';
export { LinkDialog, ImageDialog, VideoDialog, HelpDialog } from './chrome/dialogs';
export type { DialogProps } from './chrome/dialogs';
export { ChromeProvider, useChrome, useCommand } from './chrome/ChromeContext';
export type { ChromeValue, ChromeUI, ChromeOptions } from './chrome/ChromeContext';
