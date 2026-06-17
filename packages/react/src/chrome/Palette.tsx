import { useChrome } from './ChromeContext';

export interface PaletteProps {
  /** 'fore' (text) or 'back' (background). */
  kind: 'fore' | 'back';
  /** invoked with the chosen color (or 'inherit'/'transparent' for reset). */
  onPick: (color: string) => void;
}

/**
 * 8×8 color grid (port of the lite ui.palette). Each swatch is a button; titles come from
 * options.colorsName. Preserves the .note-color-palette / .note-color-btn class contract.
 */
export function Palette({ kind, onPick }: PaletteProps): JSX.Element {
  const { options, lang } = useChrome();
  const reset = kind === 'fore' ? 'inherit' : 'transparent';
  const resetLabel = kind === 'fore' ? lang.color.resetToDefault : lang.color.setTransparent;

  return (
    <div className="note-color-palette" data-kind={kind}>
      <button
        type="button"
        className="note-color-reset note-btn note-btn-block"
        title={resetLabel}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(reset)}
      >
        {resetLabel}
      </button>
      {options.colors.map((row, ri) => (
        <div key={ri} className="note-color-row">
          {row.map((color, ci) => {
            const name = options.colorsName[ri]?.[ci] ?? color;
            return (
              <button
                key={color + ci}
                type="button"
                className="note-color-btn"
                style={{ backgroundColor: color }}
                title={name}
                aria-label={name}
                data-value={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(color)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
