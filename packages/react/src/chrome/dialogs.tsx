import { useRef, useState } from 'react';
import { env } from '@eaeao4jerry/summernote-core';
import { useChrome } from './ChromeContext';
import { Modal } from './Modal';

export interface DialogProps {
  onClose: () => void;
}

/** Insert/Edit Link dialog — prefilled from the saved selection (text + existing anchor). */
export function LinkDialog({ onClose }: DialogProps): JSX.Element {
  const { core, lang } = useChrome();
  const anchor = core ? core.getAnchorInfo() : null;
  const [text, setText] = useState(anchor ? anchor.text : core ? core.getSelectedText() : '');
  const [url, setUrl] = useState(anchor ? anchor.url : '');
  const [newWindow, setNewWindow] = useState(anchor ? anchor.newWindow : true);

  const submit = (): void => {
    if (url === '') {
      return;
    }
    core?.restoreRange();
    core?.command('createLink', { url, text, newWindow });
    onClose();
  };

  return (
    <Modal
      title={lang.link.insert}
      onClose={onClose}
      className="link-dialog"
      footer={
        <button type="button" className="note-btn note-btn-primary" disabled={url === ''} onClick={submit}>
          {lang.link.insert}
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="note-form-group">
          <label className="note-form-label">{lang.link.textToDisplay}</label>
          <input
            className="note-link-text note-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="note-form-group">
          <label className="note-form-label">{lang.link.url}</label>
          <input
            className="note-link-url note-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <label className="note-form-checkbox sn-checkbox-open-in-new-window">
          <input type="checkbox" checked={newWindow} onChange={(e) => setNewWindow(e.target.checked)} />{' '}
          {lang.link.openInNewWindow}
        </label>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Insert Image dialog — file upload (-> dataURL) or URL. */
export function ImageDialog({ onClose }: DialogProps): JSX.Element {
  const { core, lang } = useChrome();
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const insertUrl = (): void => {
    if (url === '') {
      return;
    }
    core?.restoreRange();
    core?.command('insertImage', url);
    onClose();
  };

  const onFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) {
      return;
    }
    core?.restoreRange();
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (): void => {
        core?.command('insertImage', String(reader.result), file.name);
      };
      reader.readAsDataURL(file);
    }
    onClose();
  };

  return (
    <Modal
      title={lang.image.insert}
      onClose={onClose}
      className="image-dialog"
      footer={
        <button type="button" className="note-btn note-btn-primary" disabled={url === ''} onClick={insertUrl}>
          {lang.image.insert}
        </button>
      }
    >
      <div className="note-form-group note-group-select-from-files">
        <label className="note-form-label">{lang.image.selectFromFiles}</label>
        <input
          ref={fileRef}
          className="note-image-input note-input"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      <div className="note-form-group note-group-image-url">
        <label className="note-form-label">{lang.image.url}</label>
        <input
          className="note-image-url note-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              insertUrl();
            }
          }}
        />
      </div>
    </Modal>
  );
}

/** Insert Video dialog — provider URL parsed by the engine. */
export function VideoDialog({ onClose }: DialogProps): JSX.Element {
  const { core, lang } = useChrome();
  const [url, setUrl] = useState('');

  const submit = (): void => {
    if (url === '') {
      return;
    }
    core?.restoreRange();
    core?.command('insertVideo', url);
    onClose();
  };

  return (
    <Modal
      title={lang.video.insert}
      onClose={onClose}
      className="video-dialog"
      footer={
        <button type="button" className="note-btn note-btn-primary" disabled={url === ''} onClick={submit}>
          {lang.video.insert}
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="note-form-group">
          <label className="note-form-label">
            {lang.video.url} <small className="text-muted">{lang.video.providers}</small>
          </label>
          <input
            className="note-video-url note-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function formatShortcut(key: string, isMac: boolean): string {
  let k = key;
  if (isMac) {
    k = k.replace('CMD', '⌘').replace('SHIFT', '⇧');
  }
  return k.replace('BACKSLASH', '\\').replace('SLASH', '/').replace('LEFTBRACKET', '[').replace('RIGHTBRACKET', ']');
}

/** Help dialog — lists the keyboard shortcuts from the keyMap + lang.help. */
export function HelpDialog({ onClose }: DialogProps): JSX.Element {
  const { lang, options } = useChrome();
  const map = env.isMac ? options.keyMap.mac : options.keyMap.pc;
  const helpLang = lang.help as Record<string, string>;
  const entries = Object.entries(map);

  return (
    <Modal title={lang.shortcut.shortcuts} onClose={onClose} className="help-dialog">
      <div className="note-shortcut-list">
        {entries.map(([shortcut, method]) => (
          <div key={shortcut} className="note-shortcut-row">
            <kbd className="note-shortcut-key">{formatShortcut(shortcut, env.isMac)}</kbd>
            <span className="note-shortcut-name">{helpLang[method] ?? method}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
