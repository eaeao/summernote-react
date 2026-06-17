import { useState } from 'react';
import { useChrome, useCommand } from '../chrome/ChromeContext';
import { Modal } from '../chrome/Modal';
import { definePlugin } from '../plugin';

// special-character entities (ported from public/plugin/specialchars)
const SPECIAL_CHARS = [
  '&quot;', '&amp;', '&lt;', '&gt;', '&iexcl;', '&cent;', '&pound;', '&curren;', '&yen;', '&brvbar;', '&sect;',
  '&uml;', '&copy;', '&ordf;', '&laquo;', '&not;', '&reg;', '&macr;', '&deg;', '&plusmn;', '&sup2;', '&sup3;',
  '&acute;', '&micro;', '&para;', '&middot;', '&cedil;', '&sup1;', '&ordm;', '&raquo;', '&frac14;', '&frac12;',
  '&frac34;', '&iquest;', '&times;', '&divide;', '&fnof;', '&circ;', '&tilde;', '&ndash;', '&mdash;', '&lsquo;',
  '&rsquo;', '&sbquo;', '&ldquo;', '&rdquo;', '&bdquo;', '&dagger;', '&Dagger;', '&bull;', '&hellip;', '&permil;',
  '&prime;', '&Prime;', '&lsaquo;', '&rsaquo;', '&oline;', '&frasl;', '&euro;', '&image;', '&weierp;', '&real;',
  '&trade;', '&alefsym;', '&larr;', '&uarr;', '&rarr;', '&darr;', '&harr;', '&crarr;', '&lArr;', '&uArr;', '&rArr;',
  '&dArr;', '&hArr;', '&forall;', '&part;', '&exist;', '&empty;', '&nabla;', '&isin;', '&notin;', '&ni;', '&prod;',
  '&sum;', '&minus;', '&lowast;', '&radic;', '&prop;', '&infin;', '&ang;', '&and;', '&or;', '&cap;', '&cup;', '&int;',
  '&there4;', '&sim;', '&cong;', '&asymp;', '&ne;', '&equiv;', '&le;', '&ge;', '&sub;', '&sup;', '&nsub;', '&sube;',
  '&supe;', '&oplus;', '&otimes;', '&perp;', '&sdot;', '&lceil;', '&rceil;', '&lfloor;', '&rfloor;', '&loz;',
  '&spades;', '&clubs;', '&hearts;', '&diams;',
];

function decodeEntity(entity: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = entity;
  return tmp.textContent ?? '';
}

function SpecialCharsButton(): JSX.Element {
  const { core, options, lang } = useChrome();
  const cmd = useCommand();
  const [open, setOpen] = useState(false);
  const title = lang.specialChar?.specialChar ?? 'Special characters';

  const openDialog = (): void => {
    core?.saveRange(); // capture selection before the modal takes focus
    setOpen(true);
  };
  const pick = (entity: string): void => {
    core?.restoreRange();
    cmd('insertSpecialChar', entity);
    setOpen(false);
    core?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="note-btn note-btn-specialchars"
        title={title}
        aria-label={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openDialog}
      >
        <span className={options.icons.question} aria-hidden="true" />
      </button>
      {open ? (
        <Modal title={lang.specialChar?.select ?? title} onClose={() => setOpen(false)} className="specialchars-dialog">
          <div className="note-specialchar-grid">
            {SPECIAL_CHARS.map((entity) => (
              <button
                key={entity}
                type="button"
                className="note-specialchar-btn note-btn"
                aria-label={entity}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(entity)}
                dangerouslySetInnerHTML={{ __html: entity }}
              />
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export const specialcharsPlugin = definePlugin({
  name: 'specialchars',
  commands: {
    insertSpecialChar: (core, ...args): boolean => {
      const ch = decodeEntity(String(args[0] ?? ''));
      if (ch === '') {
        return false;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        return false;
      }
      const range = sel.getRangeAt(0);
      if (!core.ownsRange(range)) {
        return false;
      }
      range.deleteContents();
      const node = document.createTextNode(ch);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      return true;
    },
  },
  buttons: {
    specialchars: SpecialCharsButton,
  },
});
