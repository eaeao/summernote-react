import { describe, it, expect, afterEach } from 'vitest';
import { StrictMode, useState } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SummernoteEditor } from '../src/SummernoteEditor';

afterEach(() => {
  cleanup();
});

function selectContents(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

describe('SummernoteEditor (multi-engine)', () => {
  it('renders the chrome and seeds an uncontrolled editable', () => {
    const { container } = render(<SummernoteEditor defaultValue="<p>hello</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    expect(editable.getAttribute('contenteditable')).toBe('true');
    expect(editable.innerHTML).toBe('<p>hello</p>');
  });

  it('the Bold button applies bold and reflects active state', () => {
    const { container, getByText } = render(<SummernoteEditor defaultValue="<p>hello</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    selectContents(editable.querySelector('p') as HTMLElement);

    fireEvent.click(getByText('Bold'));

    expect(editable.innerHTML).toBe('<p><b>hello</b></p>');
    expect(getByText('Bold').getAttribute('aria-pressed')).toBe('true');
  });

  it('does NOT re-render the editable subtree when the chrome re-renders (reconciler exclusion)', () => {
    const { container, rerender } = render(<SummernoteEditor defaultValue="<p>hello</p>" />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    const para = editable.querySelector('p');

    // re-render with identical props
    rerender(<SummernoteEditor defaultValue="<p>hello</p>" />);

    expect(container.querySelector('.note-editable')).toBe(editable); // same DOM node
    expect(editable.querySelector('p')).toBe(para); // engine-owned child untouched by React
  });

  it('mounts idempotently under StrictMode (one live core, no doubled/empty content)', () => {
    const { container, getByText } = render(
      <StrictMode>
        <SummernoteEditor defaultValue="<p>hi</p>" />
      </StrictMode>,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    expect(editable.innerHTML).toBe('<p>hi</p>');

    selectContents(editable.querySelector('p') as HTMLElement);
    fireEvent.click(getByText('Bold'));
    expect(editable.innerHTML).toBe('<p><b>hi</b></p>');
  });

  it('controlled value does not clobber on a self-originated change', () => {
    function Controlled(): JSX.Element {
      const [html, setHtml] = useState('<p>hello</p>');
      return <SummernoteEditor value={html} onChange={setHtml} />;
    }
    const { container, getByText } = render(<Controlled />);
    const editable = container.querySelector('.note-editable') as HTMLElement;

    selectContents(editable.querySelector('p') as HTMLElement);
    fireEvent.click(getByText('Bold'));

    // bold applied; onChange -> parent value updates -> effect sees value === lastEmitted -> no re-seed
    expect(editable.innerHTML).toBe('<p><b>hello</b></p>');
    expect(container.querySelector('.note-editable')).toBe(editable); // editable not re-created
  });

  it('controlled value DOES apply an external (non-self-originated) change', () => {
    function Controlled(): JSX.Element {
      const [html, setHtml] = useState('<p>hello</p>');
      return (
        <div>
          <button type="button" onClick={() => setHtml('<p>external</p>')}>
            ext
          </button>
          <SummernoteEditor value={html} onChange={setHtml} />
        </div>
      );
    }
    const { container, getByText } = render(<Controlled />);
    const editable = container.querySelector('.note-editable') as HTMLElement;
    expect(editable.innerHTML).toBe('<p>hello</p>');

    fireEvent.click(getByText('ext'));
    expect(editable.innerHTML).toBe('<p>external</p>');
  });
});
