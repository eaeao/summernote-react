import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SummernoteEditor } from '../src/SummernoteEditor';
import { specialcharsPlugin } from '../src/plugins/specialchars';
import { databasicPlugin } from '../src/plugins/databasic';

afterEach(() => {
  cleanup();
});

function caretInto(node: Node, offset: number): void {
  const r = document.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

describe('specialchars + databasic plugins (multi-engine)', () => {
  it('specialchars opens a grid dialog and inserts the chosen character', () => {
    const { container, getByRole } = render(
      <SummernoteEditor defaultValue="<p>x</p>" plugins={[specialcharsPlugin]} toolbar={[['insert', ['specialchars']]]} />,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    caretInto(editable.querySelector('p')!.firstChild as Node, 1);

    fireEvent.click(getByRole('button', { name: 'SPECIAL CHARACTERS' }));
    expect(container.querySelector('.note-specialchar-grid')).not.toBeNull();
    // pick the euro sign
    fireEvent.click(getByRole('button', { name: '&euro;' }));

    expect(editable.textContent).toContain('€');
    expect(container.querySelector('.note-specialchar-grid')).toBeNull(); // closed
  });

  it('databasic inserts a basic data table', () => {
    const { container, getByRole } = render(
      <SummernoteEditor defaultValue="<p>x</p>" plugins={[databasicPlugin]} toolbar={[['insert', ['databasic']]]} />,
    );
    const editable = container.querySelector('.note-editable') as HTMLElement;
    caretInto(editable.querySelector('p')!.firstChild as Node, 1);

    fireEvent.click(getByRole('button', { name: 'Insert basic data table' }));

    const table = editable.querySelector('table.note-data-basic') as HTMLTableElement;
    expect(table).not.toBeNull();
    expect(table.querySelectorAll('th').length).toBe(2);
    expect(table.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('multiple plugins register together', () => {
    const { getByRole } = render(
      <SummernoteEditor
        defaultValue="<p>x</p>"
        plugins={[specialcharsPlugin, databasicPlugin]}
        toolbar={[['insert', ['specialchars', 'databasic']]]}
      />,
    );
    expect(getByRole('button', { name: 'SPECIAL CHARACTERS' })).not.toBeNull();
    expect(getByRole('button', { name: 'Insert basic data table' })).not.toBeNull();
  });
});
