import type { ReactNode } from 'react';
import { useChrome, useCommand } from './ChromeContext';
import { Popover } from './Popover';

interface Pos {
  top: number;
  left: number;
}

function PopBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      className="note-btn"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Link popover — shows the href + Edit (open dialog) / Unlink. */
export function LinkPopover({ href, pos }: { href: string; pos: Pos }): JSX.Element {
  const { lang, options, ui } = useChrome();
  const cmd = useCommand();
  return (
    <Popover className="note-link-popover" top={pos.top} left={pos.left}>
      <span className="note-popover-link-info">
        <a href={href} target="_blank" rel="noopener noreferrer" className="note-popover-link">
          {href}
        </a>
      </span>
      <div className="note-btn-group">
        <PopBtn title={lang.link.edit} onClick={() => ui.openLinkDialog?.()}>
          <span className={options.icons.link} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.link.unlink} onClick={() => cmd('unlink')}>
          <span className={options.icons.unlink} aria-hidden="true" />
        </PopBtn>
      </div>
    </Popover>
  );
}

/** Table popover — add/delete rows/cols + delete table. */
export function TablePopover({ pos }: { pos: Pos }): JSX.Element {
  const { lang, options } = useChrome();
  const cmd = useCommand();
  return (
    <Popover className="note-table-popover" top={pos.top} left={pos.left}>
      <div className="note-btn-group note-table-add">
        <PopBtn title={lang.table.addRowAbove} onClick={() => cmd('addRow', 'top')}>
          <span className={options.icons.rowAbove} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.table.addRowBelow} onClick={() => cmd('addRow', 'bottom')}>
          <span className={options.icons.rowBelow} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.table.addColLeft} onClick={() => cmd('addCol', 'left')}>
          <span className={options.icons.colBefore} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.table.addColRight} onClick={() => cmd('addCol', 'right')}>
          <span className={options.icons.colAfter} aria-hidden="true" />
        </PopBtn>
      </div>
      <div className="note-btn-group note-table-delete">
        <PopBtn title={lang.table.delRow} onClick={() => cmd('deleteRow')}>
          <span className={options.icons.rowRemove} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.table.delCol} onClick={() => cmd('deleteCol')}>
          <span className={options.icons.colRemove} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.table.delTable} onClick={() => cmd('deleteTable')}>
          <span className={options.icons.trash} aria-hidden="true" />
        </PopBtn>
      </div>
    </Popover>
  );
}

/** Image popover — resize / float / remove on the selected image. */
export function ImagePopover({
  img,
  pos,
  onAfterRemove,
}: {
  img: HTMLImageElement;
  pos: Pos;
  onAfterRemove: () => void;
}): JSX.Element {
  const { lang, options } = useChrome();
  const cmd = useCommand();
  return (
    <Popover className="note-image-popover" top={pos.top} left={pos.left}>
      <div className="note-btn-group note-resize">
        <PopBtn title={lang.image.resizeFull} onClick={() => cmd('resizeImage', img, '1')}>
          <span className="note-fontsize-10">100%</span>
        </PopBtn>
        <PopBtn title={lang.image.resizeHalf} onClick={() => cmd('resizeImage', img, '0.5')}>
          <span className="note-fontsize-10">50%</span>
        </PopBtn>
        <PopBtn title={lang.image.resizeQuarter} onClick={() => cmd('resizeImage', img, '0.25')}>
          <span className="note-fontsize-10">25%</span>
        </PopBtn>
        <PopBtn title={lang.image.resizeNone} onClick={() => cmd('resizeImage', img, 'none')}>
          <span className={options.icons.rollback} aria-hidden="true" />
        </PopBtn>
      </div>
      <div className="note-btn-group note-float">
        <PopBtn title={lang.image.floatLeft} onClick={() => cmd('floatImage', img, 'left')}>
          <span className={options.icons.floatLeft} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.image.floatRight} onClick={() => cmd('floatImage', img, 'right')}>
          <span className={options.icons.floatRight} aria-hidden="true" />
        </PopBtn>
        <PopBtn title={lang.image.floatNone} onClick={() => cmd('floatImage', img, 'none')}>
          <span className={options.icons.rollback} aria-hidden="true" />
        </PopBtn>
      </div>
      <div className="note-btn-group note-remove">
        <PopBtn
          title={lang.image.remove}
          onClick={() => {
            cmd('removeMedia', img);
            onAfterRemove();
          }}
        >
          <span className={options.icons.trash} aria-hidden="true" />
        </PopBtn>
      </div>
    </Popover>
  );
}
