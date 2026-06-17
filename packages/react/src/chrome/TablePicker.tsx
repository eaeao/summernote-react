import { useState } from 'react';
import { useChrome } from './ChromeContext';

export interface TablePickerProps {
  /** invoked with the chosen dimension as "COLxROW" (matches insertTable arg). */
  onPick: (dim: string) => void;
}

/**
 * Table size picker grid (port of the lite table dropdown). Hovering highlights a COLxROW region;
 * clicking inserts. Bounded by options.insertTableMaxSize. Preserves the .note-dimension-picker
 * class contract.
 */
export function TablePicker({ onPick }: TablePickerProps): JSX.Element {
  const { options } = useChrome();
  const maxCol = options.insertTableMaxSize.col;
  const maxRow = options.insertTableMaxSize.row;
  const [hover, setHover] = useState({ col: 0, row: 0 });

  const rows = [];
  for (let r = 1; r <= maxRow; r++) {
    const cells = [];
    for (let c = 1; c <= maxCol; c++) {
      const highlighted = c <= hover.col && r <= hover.row;
      cells.push(
        <div
          key={c}
          className={`note-dimension-picker-cell${highlighted ? ' note-active' : ''}`}
          data-event="insertTable"
          data-value={`${c}x${r}`}
          onMouseEnter={() => setHover({ col: c, row: r })}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(`${c}x${r}`)}
        />,
      );
    }
    rows.push(
      <div key={r} className="note-dimension-picker-row">
        {cells}
      </div>,
    );
  }

  return (
    <div className="note-dimension-picker">
      <div className="note-dimension-picker-mousecatcher" />
      <div className="note-dimension-picker-grid" onMouseLeave={() => setHover({ col: 0, row: 0 })}>
        {rows}
      </div>
      <div className="note-dimension-display">{`${hover.col} x ${hover.row}`}</div>
    </div>
  );
}
