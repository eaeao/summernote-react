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

describe('createLink / unlink / insertHorizontalRule (multi-engine)', () => {
  it('createLink wraps the selection in an anchor', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('createLink', { url: 'https://summernote.org' });
    expect(core.getHTML()).equalsIgnoreCase('<p><a href="https://summernote.org">hello</a></p>');
    core.destroy();
  });

  it('createLink with newWindow adds target + rel', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('createLink', { url: 'https://summernote.org', newWindow: true });
    const html = core.getHTML();
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    core.destroy();
  });

  it('unlink unwraps the anchor', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p><a href="https://summernote.org">hello</a></p>' });
    selectContents(el.querySelector('a') as HTMLElement);
    core.command('unlink');
    expect(core.getHTML()).equalsIgnoreCase('<p>hello</p>');
    core.destroy();
  });

  it('insertHorizontalRule inserts an hr', () => {
    const el = mount('<div></div>');
    const core = createEditorCore(el, { value: '<p>hello</p>' });
    selectContents(el.querySelector('p') as HTMLElement);
    core.command('insertHorizontalRule');
    expect(core.getHTML().toLowerCase()).toContain('<hr>');
    core.destroy();
  });
});
