import { describe, it, expect, afterEach } from 'vitest';
import { createVideoNode } from '../src/media/video';
import { createEditorCore } from '../src/EditorCore';
import { mount, resetDom } from '../../../test/util';

afterEach(() => {
  resetDom();
});

describe('createVideoNode — provider parsing (multi-engine)', () => {
  it('parses a YouTube watch URL into an embed iframe', () => {
    const node = createVideoNode('https://www.youtube.com/watch?v=dQw4w9WgXcQ') as HTMLIFrameElement;
    expect(node).not.toBeNull();
    expect(node.tagName).toBe('IFRAME');
    expect(node.getAttribute('src')).toBe('//www.youtube.com/embed/dQw4w9WgXcQ');
    expect(node.classList.contains('note-video-clip')).toBe(true);
  });

  it('parses a youtu.be short link with a start time', () => {
    const node = createVideoNode('https://youtu.be/dQw4w9WgXcQ?t=1m30s') as HTMLIFrameElement;
    expect(node.getAttribute('src')).toBe('//www.youtube.com/embed/dQw4w9WgXcQ?start=90');
  });

  it('parses a Vimeo URL', () => {
    const node = createVideoNode('https://vimeo.com/123456789') as HTMLIFrameElement;
    expect(node.getAttribute('src')).toBe('//player.vimeo.com/video/123456789');
  });

  it('parses an mp4 URL into a <video>', () => {
    const node = createVideoNode('https://example.com/clip.mp4') as HTMLVideoElement;
    expect(node.tagName).toBe('VIDEO');
    expect(node.getAttribute('src')).toBe('https://example.com/clip.mp4');
  });

  it('returns null for an unknown URL', () => {
    expect(createVideoNode('https://example.com/not-a-video')).toBeNull();
  });
});

describe('EditorCore selection save/restore + insertVideo (multi-engine)', () => {
  it('saveRange/restoreRange round-trips the selection', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello world</p>' });
    const text = el.querySelector('p')!.firstChild as Text;
    const r = document.createRange();
    r.setStart(text, 0);
    r.setEnd(text, 5);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);

    core.saveRange();
    expect(core.getSelectedText()).toBe('hello');

    sel.removeAllRanges(); // selection lost (as when a dialog input takes focus)
    core.restoreRange();
    expect(window.getSelection()!.toString()).toBe('hello');
    core.destroy();
  });

  it('insertVideo inserts a provider embed at the caret', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p><br></p>' });
    const p = el.querySelector('p') as HTMLElement;
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);

    core.command('insertVideo', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(el.querySelector('iframe.note-video-clip')).not.toBeNull();
    core.destroy();
  });

  it('getAnchorInfo reads the anchor under the saved selection', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p><a href="https://x.com" target="_blank">x</a></p>' });
    const a = el.querySelector('a') as HTMLAnchorElement;
    const r = document.createRange();
    r.selectNodeContents(a);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
    core.saveRange();

    const info = core.getAnchorInfo();
    expect(info).not.toBeNull();
    expect(info!.url).toBe('https://x.com');
    expect(info!.newWindow).toBe(true);
    core.destroy();
  });
});
