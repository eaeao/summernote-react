import { useChrome, useCommand } from './ChromeContext';
import { Dropdown } from './Dropdown';
import { Palette } from './Palette';
import { TablePicker } from './TablePicker';

const eq = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** style/format-block dropdown — items are options.styleTags rendered as their own tag. */
export function StyleDropdown(): JSX.Element {
  const { lang, options, state } = useChrome();
  const cmd = useCommand();
  const styleLang = lang.style as Record<string, string>;
  return (
    <Dropdown
      title={lang.style.style}
      toggleClassName="note-btn-style"
      menuClassName="dropdown-style"
      toggle={<span className={options.icons.magic} aria-hidden="true" />}
    >
      {options.styleTags.map((tag) => {
        const Tag = tag as keyof JSX.IntrinsicElements;
        const active = state.formatBlock === tag;
        return (
          <button
            key={tag}
            type="button"
            className={`note-btn note-btn-block${active ? ' active' : ''}`}
            data-value={tag}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('formatBlock', tag)}
          >
            <Tag>{styleLang[tag] ?? tag}</Tag>
          </button>
        );
      })}
    </Dropdown>
  );
}

/** fontname dropdown — checkmark the current family; label shows it. */
export function FontNameDropdown(): JSX.Element {
  const { lang, options, state } = useChrome();
  const cmd = useCommand();
  const fonts = options.fontNames;
  const current = state.fontName || fonts[0] || '';
  return (
    <Dropdown
      title={lang.font.name}
      menuClassName="dropdown-fontname"
      toggle={<span className="note-current-fontname">{current}</span>}
    >
      {fonts.map((font) => {
        const checked = eq(state.fontName, font);
        return (
          <button
            key={font}
            type="button"
            className={`note-btn note-btn-block${checked ? ' checked' : ''}`}
            data-value={font}
            style={{ fontFamily: font }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('fontName', font)}
          >
            <span className={checked ? options.icons.menuCheck : ''} aria-hidden="true" /> {font}
          </button>
        );
      })}
    </Dropdown>
  );
}

/** fontsize dropdown. */
export function FontSizeDropdown(): JSX.Element {
  const { lang, options, state } = useChrome();
  const cmd = useCommand();
  return (
    <Dropdown
      title={lang.font.size}
      menuClassName="dropdown-fontsize"
      toggle={<span className="note-current-fontsize">{state.fontSize || ''}</span>}
    >
      {options.fontSizes.map((size) => {
        const checked = state.fontSize === size;
        return (
          <button
            key={size}
            type="button"
            className={`note-btn note-btn-block${checked ? ' checked' : ''}`}
            data-value={size}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('fontSize', size)}
          >
            <span className={checked ? options.icons.menuCheck : ''} aria-hidden="true" /> {size}
          </button>
        );
      })}
    </Dropdown>
  );
}

/** fontsizeunit dropdown (px/pt). */
export function FontSizeUnitDropdown(): JSX.Element {
  const { lang, options, state } = useChrome();
  const cmd = useCommand();
  return (
    <Dropdown
      title={lang.font.sizeunit}
      menuClassName="dropdown-fontsizeunit"
      toggle={<span className="note-current-fontsizeunit">{state.fontSizeUnit || 'px'}</span>}
    >
      {options.fontSizeUnits.map((unit) => {
        const checked = state.fontSizeUnit === unit;
        return (
          <button
            key={unit}
            type="button"
            className={`note-btn note-btn-block${checked ? ' checked' : ''}`}
            data-value={unit}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('fontSizeUnit', unit)}
          >
            <span className={checked ? options.icons.menuCheck : ''} aria-hidden="true" /> {unit}
          </button>
        );
      })}
    </Dropdown>
  );
}

/** line-height dropdown. */
export function LineHeightDropdown(): JSX.Element {
  const { lang, options, state } = useChrome();
  const cmd = useCommand();
  return (
    <Dropdown
      title={lang.font.height}
      menuClassName="dropdown-line-height"
      toggle={<span className={options.icons.textHeight} aria-hidden="true" />}
    >
      {options.lineHeights.map((lh) => {
        const checked = state.lineHeight === lh;
        return (
          <button
            key={lh}
            type="button"
            className={`note-btn note-btn-block${checked ? ' checked' : ''}`}
            data-value={lh}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('lineHeight', lh)}
          >
            <span className={checked ? options.icons.menuCheck : ''} aria-hidden="true" /> {lh}
          </button>
        );
      })}
    </Dropdown>
  );
}

/** color dropdown — fore + back palettes (recent-color split button is a Phase-4 refinement). */
export function ColorDropdown(): JSX.Element {
  const { lang, options } = useChrome();
  const cmd = useCommand();
  return (
    <Dropdown
      title={`${lang.color.foreground} / ${lang.color.background}`}
      toggleClassName="note-btn-color"
      menuClassName="dropdown-color"
      toggle={<span className={options.icons.font} aria-hidden="true" />}
    >
      <div className="note-palette">
        <div className="note-palette-title">{lang.color.foreground}</div>
        <Palette kind="fore" onPick={(c) => cmd('color', { foreColor: c })} />
      </div>
      <div className="note-palette">
        <div className="note-palette-title">{lang.color.background}</div>
        <Palette kind="back" onPick={(c) => cmd('color', { backColor: c })} />
      </div>
    </Dropdown>
  );
}

/** paragraph dropdown — align + indent/outdent grid. */
export function ParagraphDropdown(): JSX.Element {
  const { lang, options, state } = useChrome();
  const cmd = useCommand();
  const aligns: Array<{ key: string; cmd: string; icon: string; title: string; active: boolean }> = [
    { key: 'left', cmd: 'justifyLeft', icon: options.icons.alignLeft, title: lang.paragraph.left, active: state.align === 'left' },
    { key: 'center', cmd: 'justifyCenter', icon: options.icons.alignCenter, title: lang.paragraph.center, active: state.align === 'center' },
    { key: 'right', cmd: 'justifyRight', icon: options.icons.alignRight, title: lang.paragraph.right, active: state.align === 'right' },
    { key: 'justify', cmd: 'justifyFull', icon: options.icons.alignJustify, title: lang.paragraph.justify, active: state.align === 'justify' },
  ];
  const indents: Array<{ key: string; cmd: string; icon: string; title: string }> = [
    { key: 'outdent', cmd: 'outdent', icon: options.icons.outdent, title: lang.paragraph.outdent },
    { key: 'indent', cmd: 'indent', icon: options.icons.indent, title: lang.paragraph.indent },
  ];
  return (
    <Dropdown
      title={lang.paragraph.paragraph}
      menuClassName="dropdown-para"
      toggle={<span className={options.icons.alignLeft} aria-hidden="true" />}
    >
      <div className="note-btn-group note-align">
        {aligns.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`note-btn note-btn-${a.key}${a.active ? ' active' : ''}`}
            title={a.title}
            aria-label={a.title}
            aria-pressed={a.active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd(a.cmd)}
          >
            <span className={a.icon} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="note-btn-group note-list">
        {indents.map((a) => (
          <button
            key={a.key}
            type="button"
            className={`note-btn note-btn-${a.key}`}
            title={a.title}
            aria-label={a.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd(a.cmd)}
          >
            <span className={a.icon} aria-hidden="true" />
          </button>
        ))}
      </div>
    </Dropdown>
  );
}

/** table picker dropdown. */
export function TableDropdown(): JSX.Element {
  const { lang, options } = useChrome();
  const cmd = useCommand();
  return (
    <Dropdown
      title={lang.table.table}
      menuClassName="dropdown-table"
      toggle={<span className={options.icons.table} aria-hidden="true" />}
    >
      <TablePicker onPick={(dim) => cmd('insertTable', dim)} />
    </Dropdown>
  );
}
