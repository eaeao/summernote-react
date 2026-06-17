import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import dom from '../../src/core/dom';
import range from '../../src/core/range';

// Ported 1:1 from test/base/core/range.spec.js. jQuery DOM construction replaced with native
// DOM (document.createElement + innerHTML, querySelector/querySelectorAll). The custom
// matchers are jest-style in this repo: expect(x).equalsIgnoreCase(y).

function fromHTML(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
}

describe('base:core.range', () => {
  describe('nodes', () => {
    describe('1 depth', () => {
      let para: NodeListOf<HTMLElement>;
      beforeAll(() => {
        const cont = fromHTML('<div class="note-editable"><p>para1</p><p>para2</p></div>');
        para = cont.querySelectorAll('p');
      });

      it('should return array of two paragraphs', () => {
        const rng = range.create(para[0].firstChild, 0, para[1].firstChild, 1)!;
        expect(rng.nodes(dom.isPara, { includeAncestor: true })).to.have.length(2);
      });

      it('should return array of a paragraph', () => {
        const rng = range.create(para[0].firstChild, 0, para[0].firstChild, 0)!;
        expect(rng.nodes(dom.isPara, { includeAncestor: true })).to.have.length(1);
      });
    });

    describe('multi depth', () => {
      it('should return array of a paragraph', () => {
        const cont = fromHTML('<div class="note-editable"><p>p<b>ar</b>a1</p><p>para2</p></div>');
        const b = cont.querySelectorAll('b');
        const rng = range.create(b[0].firstChild, 0, b[0].firstChild, 0)!;

        expect(rng.nodes(dom.isPara, { includeAncestor: true })).to.have.length(1);
      });
    });

    describe('on list, on heading', () => {
      it('should return array of list paragraphs', () => {
        const cont = fromHTML('<div class="note-editable"><ul><li>para1</li><li>para2</li></ul></div>');
        const li = cont.querySelectorAll('li');
        const rng = range.create(li[0].firstChild, 0, li[1].firstChild, 1)!;

        expect(rng.nodes(dom.isPara, { includeAncestor: true })).to.have.length(2);
      });

      it('should return array of list paragraphs', () => {
        const cont = fromHTML('<div class="note-editable"><h1>heading1</h1><h2>heading2</h2></div>');
        const h1 = cont.querySelectorAll('h1');
        const h2 = cont.querySelectorAll('h2');
        const rng = range.create(h1[0].firstChild, 0, h2[0].firstChild, 1)!;

        expect(rng.nodes(dom.isPara, { includeAncestor: true })).to.have.length(2);
      });
    });
  });

  describe('commonAncestor', () => {
    let cont: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div><span><b>b</b><u>u</u></span></div>');
    });

    it('should return <span> for <b>|b</b> and <u>u|</u>', () => {
      const span = cont.querySelectorAll('span');
      const b = cont.querySelectorAll('b');
      const u = cont.querySelectorAll('u');

      const rng = range.create(b[0].firstChild, 0, u[0].firstChild, 1)!;
      expect(rng.commonAncestor()).to.deep.equal(span[0]);
    });

    it('should return b(#textNode) for <b>|b|</b>', () => {
      const b = cont.querySelectorAll('b');

      const rng = range.create(b[0].firstChild, 0, b[0].firstChild, 1)!;
      expect(rng.commonAncestor()).to.deep.equal(b[0].firstChild);
    });
  });

  describe('expand', () => {
    it('should return <b>|b</b> ~ <u>u|</u> for <b>|b</b> with isAnchor', () => {
      const cont = fromHTML('<div><a><b>b</b><u>u</u></a></div>');
      const anchor = cont.querySelectorAll('a');
      const b = cont.querySelectorAll('b');

      const rng = range.create(b[0].firstChild, 0, b[0].firstChild, 0)!.expand(dom.isAnchor);
      expect(rng.sc).to.deep.equal(anchor[0]);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(anchor[0]);
      expect(rng.eo).to.equal(2);
    });
  });

  describe('collapse', () => {
    it('should return <u>u|</u> for <b>|b</b> ~ <u>u|</u>', () => {
      const cont = fromHTML('<div><b>b</b><u>u</u></div>');
      const b = cont.querySelectorAll('b');
      const u = cont.querySelectorAll('u');

      const rng = range.create(b[0].firstChild, 0, u[0].firstChild, 1)!.collapse();
      expect(rng.sc).to.deep.equal(u[0].firstChild);
      expect(rng.so).to.equal(1);
      expect(rng.ec).to.deep.equal(u[0].firstChild);
      expect(rng.eo).to.equal(1);
    });
  });

  describe('normalize', () => {
    let cont: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div><p><b>b</b><u>u</u><s>s</s></p></div>');
    });

    it('should return <b>|b</b> ~ <u>u|</u> for |<b>b</b> ~ <u>u</u>|', () => {
      const p = cont.querySelectorAll('p');
      const b = cont.querySelectorAll('b');
      const u = cont.querySelectorAll('u');

      const rng = range.create(p[0], 0, p[0], 2)!.normalize();
      expect(rng.sc).to.deep.equal(b[0].firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(u[0].firstChild);
      expect(rng.eo).to.equal(1);
    });

    it('should return <b>b|</b><u>u</u> for <b>b</b>|<u>u</u>', () => {
      const p = cont.querySelectorAll('p');
      const b = cont.querySelectorAll('b');

      const rng = range.create(p[0], 1, p[0], 1)!.normalize();
      expect(rng.sc).to.deep.equal(b[0].firstChild);
      expect(rng.so).to.equal(1);
      expect(rng.ec).to.deep.equal(b[0].firstChild);
      expect(rng.eo).to.equal(1);
    });

    it('should return <b>b</b><u>|u|</u><s>s</s> for <b>b|</b><u>u</u><s>|s</s>', () => {
      const b = cont.querySelectorAll('b');
      const u = cont.querySelectorAll('u');
      const s = cont.querySelectorAll('s');

      const rng = range.create(b[0].firstChild, 1, s[0].firstChild, 0)!.normalize();
      expect(rng.sc).to.deep.equal(u[0].firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(u[0].firstChild);
      expect(rng.eo).to.equal(1);
    });

    it('should return <b>b|</b><u>u</u><s>s</s> for <b>b|</b><u>u</u><s>s</s>', () => {
      const b = cont.querySelectorAll('b');

      const rng = range.create(b[0].firstChild, 1, b[0].firstChild, 1)!.normalize();
      expect(rng.sc).to.deep.equal(b[0].firstChild);
      expect(rng.so).to.equal(1);
      expect(rng.ec).to.deep.equal(b[0].firstChild);
      expect(rng.eo).to.equal(1);
    });
  });

  describe('normalize (block mode)', () => {
    it('should return <p>text</p><p>|<br></p> for <p>text</p><p>|<br></p>', () => {
      const cont = fromHTML('<div><p>text</p><p><br></p></div>');
      const p = cont.querySelectorAll('p');

      const rng = range.create(p[1], 0, p[1], 0)!.normalize();
      expect(rng.sc).to.deep.equal(p[1]);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(p[1]);
      expect(rng.eo).to.equal(0);
    });

    it('should return <p>text</p><p>|text</p> for <p>text</p><p>|text</p>', () => {
      const cont = fromHTML('<div><p>text</p><p>text</p></div>');
      const p = cont.querySelectorAll('p');

      const rng = range.create(p[1], 0, p[1], 0)!.normalize();
      expect(rng.sc).to.deep.equal(p[1].firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(p[1].firstChild);
      expect(rng.eo).to.equal(0);
    });

    it('should return <p>|text</p><p>text|</p> for |<p>text</p><p>text</p>|', () => {
      const cont = fromHTML('<div class="note-editable"><p>text</p><p>text</p></div>');
      const p = cont.querySelectorAll('p');

      const rng = range.create(cont, 0, cont, 2)!.normalize();
      expect(rng.sc).to.deep.equal(p[0].firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(p[1].firstChild);
      expect(rng.eo).to.equal(4);
    });
  });

  describe('normalize (void element)', () => {
    it('should return <p><img>|<b>bold</b></p> for <p><img>|<b>bold</b></p>', () => {
      const cont = fromHTML('<div><p><img><b>bold</b></p></div>');
      const p = cont.querySelectorAll('p');
      const b = cont.querySelectorAll('b');

      const rng = range.create(p[0], 1, p[0], 1)!.normalize();
      expect(rng.sc).to.deep.equal(b[0].firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(b[0].firstChild);
      expect(rng.eo).to.equal(0);
    });

    it('should return <p><img>|text></p> for <p><img>|text></p>', () => {
      const cont = fromHTML('<div><p><img>bold</p></div>');
      const img = cont.querySelectorAll('img');
      const text = img[0].nextSibling!;

      const rng = range.create(text, 0, text, 0)!.normalize();
      expect(rng.sc).to.equal(text);
      expect(rng.so).to.equal(0);
      expect(rng.isCollapsed()).to.true;
    });
  });

  describe('insertNode', () => {
    it('should split paragraph when inserting a block element', () => {
      const cont = fromHTML('<div class="note-editable"><p><b>bold</b></p></div>');
      const b = cont.querySelectorAll('b');
      const p2 = fromHTML('<p>p</p>');

      const rng = range.create(b[0].firstChild, 2, b[0].firstChild, 2)!;
      rng.insertNode(p2);

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>bo</b></p><p>p</p><p><b>ld</b></p>');
    });

    it('should not split paragraph when inserting an inline element', () => {
      const cont = fromHTML('<div class="note-editable"><p>text</p></div>');
      const p = cont.querySelectorAll('p');
      const u = fromHTML('<u>u</u>');

      const rng = range.create(p[0].firstChild, 2, p[0].firstChild, 2)!;
      rng.insertNode(u);
      expect(cont.innerHTML).equalsIgnoreCase('<p>te<u>u</u>xt</p>');
    });

    it('should not split paragraph when inserting an inline element case 2', () => {
      const cont = fromHTML('<div class="note-editable"><p><b>bold</b></p></div>');
      const b = cont.querySelectorAll('b');
      const u = fromHTML('<u>u</u>');

      const rng = range.create(b[0].firstChild, 2, b[0].firstChild, 2)!;
      rng.insertNode(u);
      expect(cont.innerHTML).equalsIgnoreCase('<p><b>bo</b><u>u</u><b>ld</b></p>');
    });
  });

  describe('pasteHTML', () => {
    it('should not split a block element when inserting inline elements into it', () => {
      const cont = fromHTML('<div class="note-editable"><p>text</p></div>');
      const p = cont.querySelectorAll('p');
      const markup = '<span>span</span><i>italic</i>';

      const rng = range.create(p[0].firstChild, 2)!;
      rng.pasteHTML(markup);

      expect(cont.innerHTML).equalsIgnoreCase('<p>te<span>span</span><i>italic</i>xt</p>');
    });

    it('should split an inline element when pasting inline elements into it', () => {
      const cont = fromHTML('<div class="note-editable"><p><b>bold</b></p></div>');
      const b = cont.querySelectorAll('b');
      const markup = '<span>span</span><i>italic</i>';

      const rng = range.create(b[0].firstChild, 2)!;
      rng.pasteHTML(markup);

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>bo</b><span>span</span><i>italic</i><b>ld</b></p>');
    });

    it('should split inline node when pasting an inline node and a block node into it', () => {
      const cont = fromHTML('<div class="note-editable"><p><b>bold</b></p></div>');
      const b = cont.querySelectorAll('b');
      const markup = '<span>span</span><p><i>italic</i></p>';

      const rng = range.create(b[0].firstChild, 2)!;
      rng.pasteHTML(markup);

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>bo</b><span>span</span></p><p><i>italic</i></p><p><b>ld</b></p>');
    });
  });

  describe('deleteContents', () => {
    let cont: HTMLElement, b: NodeListOf<HTMLElement>;
    beforeEach(() => {
      cont = fromHTML('<div class="note-editable"><p><b>bold</b><u>u</u></p></div>');
      b = cont.querySelectorAll('b');
    });

    it('should remove text only for partial text', () => {
      const rng = range.create(b[0].firstChild, 1, b[0].firstChild, 3)!;
      rng.deleteContents();

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>bd</b><u>u</u></p>');
    });

    it('should remove text for entire text', () => {
      const rng = range.create(b[0].firstChild, 0, b[0].firstChild, 4)!;
      rng.deleteContents();

      expect(cont.innerHTML).equalsIgnoreCase('<p><b></b><u>u</u></p>');
    });
  });

  describe('wrapBodyInlineWithPara', () => {
    it('should insert an empty paragraph when there is no contents', () => {
      const cont = fromHTML('<div class="note-editable"></div>');

      const rng = range.create(cont, 0)!;
      rng.wrapBodyInlineWithPara();

      expect(cont.innerHTML).equalsIgnoreCase('<p><br></p>');
    });

    it('should wrap text with paragraph for text', () => {
      const cont = fromHTML('<div class="note-editable">text</div>');

      const rng = range.create(cont.firstChild, 2)!;
      rng.wrapBodyInlineWithPara();

      expect(cont.innerHTML).equalsIgnoreCase('<p>text</p>');
    });

    it('should wrap an inline node with paragraph when selecting text in the inline node', () => {
      const cont = fromHTML('<div class="note-editable"><b>bold</b></div>');
      const b = cont.querySelectorAll('b');

      const rng = range.create(b[0].firstChild, 2)!;
      rng.wrapBodyInlineWithPara();

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>bold</b></p>');
    });

    it('should wrap inline nodes with paragraph when selecting text in the inline nodes', () => {
      const cont = fromHTML('<div class="note-editable"><b>b</b><i>i</i></div>');

      const rng = range.create(cont, 0)!;
      rng.wrapBodyInlineWithPara();

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>b</b><i>i</i></p>');
    });

    it('should wrap inline nodes with paragraph when selection some of text in the inline nodes #1', () => {
      const cont = fromHTML('<div class="note-editable"><b>b</b><i>i</i></div>');

      const rng = range.create(cont, 1)!;
      rng.wrapBodyInlineWithPara();

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>b</b><i>i</i></p>');
    });

    it('should wrap inline nodes with paragraph when selection some of text in the inline nodes #2', () => {
      const cont = fromHTML('<div class="note-editable"><b>b</b><i>i</i></div>');

      const rng = range.create(cont, 2)!;
      rng.wrapBodyInlineWithPara();

      expect(cont.innerHTML).equalsIgnoreCase('<p><b>b</b><i>i</i></p>');
    });
  });

  describe('getWordRange', () => {
    let cont: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable">super simple wysiwyg editor</div>');
    });

    it('should return the range itself when there is no word before cursor', () => {
      const rng = range.create(cont.firstChild, 0)!.getWordRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(0);
    });

    it('should return expanded range when there is a word before cursor', () => {
      const rng = range.create(cont.firstChild, 5)!.getWordRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(5);
    });

    it('should return expanded range when there is a half word before cursor', () => {
      const rng = range.create(cont.firstChild, 3)!.getWordRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(3);
    });

    it('should return expanded range when there are words before cursor', () => {
      const rng = range.create(cont.firstChild, 12)!.getWordRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(6);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(12);
    });
  });

  describe('getWordsRange', () => {
    let cont: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable">super &nbsp; simple wysiwyg editor</div>');
    });

    it('should return the range itself when there is no word before cursor', () => {
      const rng = range.create(cont.firstChild, 0)!.getWordsRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(0);
    });

    it('should return expanded range when there is a word before cursor', () => {
      const rng = range.create(cont.firstChild, 5)!.getWordsRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(5);
    });

    it('should return expanded range when there is a half word before cursor', () => {
      const rng = range.create(cont.firstChild, 3)!.getWordsRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(3);
    });

    it('should return expanded range when there are words before cursor', () => {
      const rng = range.create(cont.firstChild, 14)!.getWordsRange();

      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(0);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(14);
    });
  });

  describe('getWordsMatchRange', () => {
    let cont: HTMLElement, regex: RegExp;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable">hi @Peter Pan. How are you?</div>');
      regex = /@[a-z ]+/i;
    });

    it('should return null when there is no word before cursor', () => {
      const rng = range.create(cont.firstChild, 0)!.getWordsMatchRange(regex);
      expect(rng).to.be.a('null');
    });

    it('should return expanded range when there are words before cursor', () => {
      const rng = range.create(cont.firstChild, 13)!.getWordsMatchRange(regex)!;

      // range: 'hi @Peter Pan'
      // matched range: '@Peter Pan'
      expect(rng.sc).to.deep.equal(cont.firstChild);
      expect(rng.so).to.equal(3);
      expect(rng.ec).to.deep.equal(cont.firstChild);
      expect(rng.eo).to.equal(13);
    });

    it('should return null when can not match', () => {
      const rng = range.create(cont.firstChild, 14)!.getWordsMatchRange(regex);

      // range: 'hi @Peter Pan.'
      expect(rng).to.be.a('null');
    });
  });
});
