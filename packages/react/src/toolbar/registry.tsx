import type { ReactNode } from 'react';
import type { EditorState, Lang, Icons } from '@summernote/core';
import { useChrome, useCommand, type ChromeUI } from '../chrome/ChromeContext';
import {
  StyleDropdown,
  FontNameDropdown,
  FontSizeDropdown,
  FontSizeUnitDropdown,
  LineHeightDropdown,
  ColorDropdown,
  ParagraphDropdown,
  TableDropdown,
} from '../chrome/dropdowns';

interface FormatSpec {
  readonly command: string;
  readonly iconKey: keyof Icons;
  readonly title: (l: Lang) => string;
  readonly isActive?: (s: EditorState) => boolean;
  readonly isDisabled?: (s: EditorState) => boolean;
}

/** command-bound toolbar buttons (the non-dropdown ones). */
const FORMAT: Record<string, FormatSpec> = {
  bold: { command: 'bold', iconKey: 'bold', title: (l) => l.font.bold, isActive: (s) => s.bold },
  italic: { command: 'italic', iconKey: 'italic', title: (l) => l.font.italic, isActive: (s) => s.italic },
  underline: { command: 'underline', iconKey: 'underline', title: (l) => l.font.underline, isActive: (s) => s.underline },
  strikethrough: {
    command: 'strikethrough',
    iconKey: 'strikethrough',
    title: (l) => l.font.strikethrough,
    isActive: (s) => s.strikethrough,
  },
  superscript: {
    command: 'superscript',
    iconKey: 'superscript',
    title: (l) => l.font.superscript,
    isActive: (s) => s.superscript,
  },
  subscript: { command: 'subscript', iconKey: 'subscript', title: (l) => l.font.subscript, isActive: (s) => s.subscript },
  clear: { command: 'removeFormat', iconKey: 'eraser', title: (l) => l.font.clear },
  ul: {
    command: 'insertUnorderedList',
    iconKey: 'unorderedlist',
    title: (l) => l.lists.unordered,
    isActive: (s) => s.unorderedList,
  },
  ol: {
    command: 'insertOrderedList',
    iconKey: 'orderedlist',
    title: (l) => l.lists.ordered,
    isActive: (s) => s.orderedList,
  },
  hr: { command: 'insertHorizontalRule', iconKey: 'minus', title: (l) => l.hr.insert },
  undo: { command: 'undo', iconKey: 'undo', title: (l) => l.history.undo, isDisabled: (s) => !s.canUndo },
  redo: { command: 'redo', iconKey: 'redo', title: (l) => l.history.redo, isDisabled: (s) => !s.canRedo },
};

function FormatButton({ name }: { name: string }): JSX.Element | null {
  const { state, lang, options } = useChrome();
  const cmd = useCommand();
  const spec = FORMAT[name];
  if (!spec) {
    return null;
  }
  const active = spec.isActive ? spec.isActive(state) : false;
  const disabled = spec.isDisabled ? spec.isDisabled(state) : false;
  const title = spec.title(lang);
  return (
    <button
      type="button"
      className={`note-btn note-btn-${name}${active ? ' active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={spec.isActive ? active : undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => cmd(spec.command)}
    >
      <span className={options.icons[spec.iconKey]} aria-hidden="true" />
    </button>
  );
}

interface ActionSpec {
  readonly iconKey: keyof Icons;
  readonly title: (l: Lang) => string;
  readonly action: keyof ChromeUI;
}

/** buttons that open a dialog or toggle a view (wired through ChromeUI handlers). */
const ACTION: Record<string, ActionSpec> = {
  link: { iconKey: 'link', title: (l) => l.link.link, action: 'openLinkDialog' },
  picture: { iconKey: 'picture', title: (l) => l.image.image, action: 'openImageDialog' },
  video: { iconKey: 'video', title: (l) => l.video.video, action: 'openVideoDialog' },
  fullscreen: { iconKey: 'arrowsAlt', title: (l) => l.options.fullscreen, action: 'toggleFullscreen' },
  codeview: { iconKey: 'code', title: (l) => l.options.codeview, action: 'toggleCodeview' },
  help: { iconKey: 'question', title: (l) => l.options.help, action: 'openHelpDialog' },
};

function ActionButton({ name }: { name: string }): JSX.Element | null {
  const { lang, options, ui } = useChrome();
  const spec = ACTION[name];
  if (!spec) {
    return null;
  }
  const title = spec.title(lang);
  const handler = ui[spec.action];
  return (
    <button
      type="button"
      className={`note-btn note-btn-${name}`}
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => handler?.()}
    >
      <span className={options.icons[spec.iconKey]} aria-hidden="true" />
    </button>
  );
}

const DROPDOWNS: Record<string, () => JSX.Element> = {
  style: StyleDropdown,
  fontname: FontNameDropdown,
  fontsize: FontSizeDropdown,
  fontsizeunit: FontSizeUnitDropdown,
  height: LineHeightDropdown,
  color: ColorDropdown,
  paragraph: ParagraphDropdown,
  table: TableDropdown,
};

/** true if a built-in renderer exists for this toolbar config name. */
export function isKnownItem(name: string): boolean {
  return name in DROPDOWNS || name in FORMAT || name in ACTION;
}

/** resolve one toolbar config name to its rendered node. */
export function ToolbarItem({ name }: { name: string }): ReactNode {
  const DropdownComp = DROPDOWNS[name];
  if (DropdownComp) {
    return <DropdownComp />;
  }
  if (FORMAT[name]) {
    return <FormatButton name={name} />;
  }
  if (ACTION[name]) {
    return <ActionButton name={name} />;
  }
  return null; // unknown / custom-button names are handled by plugins later
}
