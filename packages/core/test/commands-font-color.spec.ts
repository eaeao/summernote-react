import { describe, it, expect, afterEach } from 'vitest';
import { createEditorCore } from '../src/EditorCore';
import { mount, resetDom } from '../../../test/util';

afterEach(() => {
  resetDom();
});

function selectContents(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('font / color / lineHeight / format commands (own inline-style, multi-engine)', () => {
  it('fontName wraps the selection in a styled span', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('fontName', 'Courier New');
    const span = el.querySelector('span') as HTMLElement;
    expect(span).not.toBeNull();
    expect(span.style.fontFamily.replace(/["']/g, '')).toBe('Courier New');
    expect(span.textContent).toBe('hello');
    core.destroy();
  });

  it('fontSize applies size with the current unit', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('fontSize', '24');
    const span = el.querySelector('span') as HTMLElement;
    expect(span.style.fontSize).toBe('24px');
    core.destroy();
  });

  it('foreColor + backColor apply color / background-color', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('color', { foreColor: '#ff0000', backColor: '#00ff00' });
    const span = el.querySelector('span') as HTMLElement;
    expect(span.style.color).toBe('rgb(255, 0, 0)');
    expect(span.style.backgroundColor).toBe('rgb(0, 255, 0)');
    core.destroy();
  });

  it('lineHeight sets the paragraph line-height', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('lineHeight', '2.0');
    expect((el.querySelector('p') as HTMLElement).style.lineHeight).toBe('2');
    core.destroy();
  });

  it('formatBlock converts the block to an arbitrary style tag (blockquote)', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>quote me</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('formatBlock', 'blockquote');
    expect(el.querySelector('blockquote')).not.toBeNull();
    expect(el.querySelector('p')).toBeNull();
    core.destroy();
  });

  it('insertImage inserts an img with src + data-filename', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p><br></p>' });
    const p = el.querySelector('p') as HTMLElement;
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);

    core.command('insertImage', 'data:image/png;base64,AAAA', 'pic.png');
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(img.getAttribute('data-filename')).toBe('pic.png');
    core.destroy();
  });

  it('fontName then EditorState reports the new fontName', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('fontName', 'Arial');
    document.dispatchEvent(new Event('selectionchange'));
    expect(core.getSnapshot().fontName).toBe('Arial');
    core.destroy();
  });
});
