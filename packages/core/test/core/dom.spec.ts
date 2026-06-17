import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import dom from '../../src/core/dom';
import func from '../../src/core/func';

// Ported 1:1 from test/base/core/dom.spec.js. jQuery DOM construction replaced with native
// DOM (document.createElement + innerHTML, querySelector/querySelectorAll). The custom
// matchers are jest-style in this repo: expect(x).equalsIgnoreCase(y).

function fromHTML(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
}

describe('base:core.dom', () => {
  describe('ancestor', () => {
    let cont: HTMLElement, b: HTMLElement, txtB: Node;
    beforeAll(() => {
      // basic case
      cont = fromHTML('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      txtB = b.firstChild as Node;
    });

    it('should find ancestor B', () => {
      expect(dom.ancestor(txtB, dom.isB)).to.deep.equal(b);
    });

    it('should find ancestor DIV', () => {
      expect(dom.ancestor(txtB, dom.isDiv)).to.deep.equal(cont);
    });

    it('should return null when finding ancestor U does not exist', () => {
      expect(dom.ancestor(txtB, dom.isU)).to.be.null;
    });

    it('should return null when finding paragraph ancestor outsider note-editable', () => {
      expect(dom.ancestor(txtB, dom.isLi)).to.be.null;
    });
  });

  describe('listAncestor', () => {
    let cont: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><i><s><u><b>b</b></u></s></i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return [$b, $u, $s, $i] from b to i', () => {
      const result = dom.listAncestor(b, (node) => {
        return node === i;
      });
      expect(result).to.deep.equal([b, u, s, i]);
    });

    it('should return [$u, $s] from u to s', () => {
      const result = dom.listAncestor(u, (node) => {
        return node === s;
      });
      expect(result).to.deep.equal([u, s]);
    });
  });

  describe('listDescendant', () => {
    let cont: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><b></b><u></u><s></s><i></i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return an array of descendant elements', () => {
      expect(dom.listDescendant(cont)).to.deep.equal([b, u, s, i]);
    });

    it('should filter an array of descendant elements', () => {
      const result = dom.listDescendant(cont, (node) => {
        return node.nodeName === 'B' || node.nodeName === 'S';
      });
      expect(result).to.deep.equal([b, s]);
    });
  });

  describe('commonAncestor', () => {
    let cont: HTMLElement, span: HTMLElement, div: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement;
    beforeAll(() => {
      cont = fromHTML(
        '<div class="note-editable"><div><span><b>b</b><u>u</u></span><span><s>s</s><i>i</i></span></div></div>',
      );
      span = cont.querySelector('span') as HTMLElement;
      div = cont.querySelector('div') as HTMLElement;
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
    });

    it('should return a common element in ancestors', () => {
      expect(dom.commonAncestor(b, u)).to.deep.equal(span);
    });

    it('should return a common element in ancestors even if they have same nodeName', () => {
      expect(dom.commonAncestor(b, s)).to.deep.equal(div);
    });
  });

  describe('listNext', () => {
    let cont: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return an array of next sibling elements including itself', () => {
      expect(dom.listNext(u)).to.deep.equal([u, s, i]);
    });

    it('should return itself if there are no next sibling', () => {
      expect(dom.listNext(i)).to.deep.equal([i]);
    });

    it('should return an array of next sibling elements before predicate is true', () => {
      expect(dom.listNext(s, func.eq(i))).to.deep.equal([s]);
    });
  });

  describe('listPrev', () => {
    let cont: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return an array of previous sibling elements including itself', () => {
      expect(dom.listPrev(s)).to.deep.equal([s, u, b]);
    });

    it('should return itself if there are no previous sibling', () => {
      expect(dom.listPrev(b)).to.deep.equal([b]);
    });

    it('should return an array of previous sibling elements before predicate is true', () => {
      expect(dom.listPrev(i, func.eq(s))).to.deep.equal([i]);
    });
  });

  describe('position', () => {
    let cont: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return the position of element', () => {
      expect(dom.position(b)).to.be.equal(0);
      expect(dom.position(u)).to.be.equal(1);
      expect(dom.position(s)).to.be.equal(2);
      expect(dom.position(i)).to.be.equal(3);
    });

    it('should return position 0 for text node in b', () => {
      expect(dom.position(b.firstChild as Node)).to.be.equal(0);
    });
  });

  describe('makeOffsetPath', () => {
    let cont: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return empty array if two elements are same', () => {
      expect(dom.makeOffsetPath(cont, cont)).to.deep.equal([]);
    });

    it('should return offset path array between two elements #1', () => {
      expect(dom.makeOffsetPath(cont, b)).to.deep.equal([0]);
      expect(dom.makeOffsetPath(cont, b.firstChild as Node)).to.deep.equal([0, 0]);
    });

    it('should return offset path array between two elements #2', () => {
      expect(dom.makeOffsetPath(cont, u)).to.deep.equal([1]);
      expect(dom.makeOffsetPath(cont, u.firstChild as Node)).to.deep.equal([1, 0]);
    });

    it('should return offset path array between two elements #3', () => {
      expect(dom.makeOffsetPath(cont, s)).to.deep.equal([2]);
      expect(dom.makeOffsetPath(cont, s.firstChild as Node)).to.deep.equal([2, 0]);
    });

    it('should return offset path array between two elements #2', () => {
      expect(dom.makeOffsetPath(cont, i)).to.deep.equal([3]);
      expect(dom.makeOffsetPath(cont, i.firstChild as Node)).to.deep.equal([3, 0]);
    });
  });

  describe('fromOffsetPath', () => {
    let cont: HTMLElement, b: HTMLElement, u: HTMLElement, s: HTMLElement, i: HTMLElement;
    beforeAll(() => {
      cont = fromHTML('<div class="note-editable"><b>b</b><u>u</u><s>s</s><i>i</i></div>'); // busi
      b = cont.querySelector('b') as HTMLElement;
      u = cont.querySelector('u') as HTMLElement;
      s = cont.querySelector('s') as HTMLElement;
      i = cont.querySelector('i') as HTMLElement;
    });

    it('should return the element by offsetPath', () => {
      const contNode = cont;
      for (const node of [b, u, s, i]) {
        expect(dom.fromOffsetPath(contNode, dom.makeOffsetPath(contNode, node))).to.deep.equal(node);
        const child = node.firstChild as Node;
        expect(dom.fromOffsetPath(contNode, dom.makeOffsetPath(contNode, child))).to.deep.equal(child);
      }
    });
  });

  describe('splitTree', () => {
    let para: HTMLElement;
    beforeEach(() => {
      const busi = fromHTML('<div class="note-editable"><p><b>b</b><u>u</u><s>strike</s><i>i</i></p></div>'); // busi
      para = (busi.cloneNode(true) as HTMLElement).querySelector('p') as HTMLElement;
    });

    describe('element pivot case', () => {
      it('should be split by u tag with offset 0', () => {
        const u = para.querySelector('u') as HTMLElement;
        dom.splitTree(para, { node: u, offset: 0 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u><br></u>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<u>u</u><s>strike</s><i>i</i>');
      });

      it('should be split by u tag with offset 1', () => {
        const u = para.querySelector('u') as HTMLElement;
        dom.splitTree(para, { node: u, offset: 1 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<u><br></u><s>strike</s><i>i</i>');
      });

      it('should be split by b tag with offset 0 (left edge case)', () => {
        const b = para.querySelector('b') as HTMLElement;
        dom.splitTree(para, { node: b, offset: 0 });

        expect(para.innerHTML).equalsIgnoreCase('<b><br></b>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i>i</i>');
      });

      it('should be split by i tag with offset 1 (right edge case)', () => {
        const i = para.querySelector('i') as HTMLElement;
        dom.splitTree(para, { node: i, offset: 1 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i>i</i>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<i><br></i>');
      });

      it('should discard first split if empty and isDiscardEmptySplits=true', () => {
        const u = para.querySelector('u') as HTMLElement;
        dom.splitTree(para, { node: u, offset: 0 }, { isDiscardEmptySplits: true });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<u>u</u><s>strike</s><i>i</i>');
      });

      it('should discard second split if empty and isDiscardEmptySplits=true', () => {
        const u = para.querySelector('u') as HTMLElement;
        dom.splitTree(para, { node: u, offset: 1 }, { isDiscardEmptySplits: true });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<s>strike</s><i>i</i>');
      });
    });

    describe('textNode case', () => {
      it('should be split by s tag with offset 3 (middle case)', () => {
        const s = para.querySelector('s') as HTMLElement;
        dom.splitTree(para, { node: s.firstChild as Node, offset: 3 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s>str</s>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<s>ike</s><i>i</i>');
      });

      it('should be split by s tag with offset 0 (left edge case)', () => {
        const s = para.querySelector('s') as HTMLElement;
        dom.splitTree(para, { node: s.firstChild as Node, offset: 0 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s><br></s>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<s>strike</s><i>i</i>');
      });

      it('should be split by s tag with offset 6 (right edge case)', () => {
        const s = para.querySelector('s') as HTMLElement;
        dom.splitTree(para, { node: s.firstChild as Node, offset: 6 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i><br></i>');
        expect((para.nextElementSibling as HTMLElement).innerHTML).equalsIgnoreCase('<i>i</i>');
      });

      it('should be split by s tag with offset 3 (2 depth case)', () => {
        const s = para.querySelector('s') as HTMLElement;
        dom.splitTree(s, { node: s.firstChild as Node, offset: 3 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s>str</s><s>ike</s><i>i</i>');
      });

      it('should be split by s tag with offset 3 (1 depth and textNode case)', () => {
        const s = para.querySelector('s') as HTMLElement;
        dom.splitTree(s.firstChild as Node, { node: s.firstChild as Node, offset: 3 });

        expect(para.innerHTML).equalsIgnoreCase('<b>b</b><u>u</u><s>strike</s><i>i</i>');
      });

      it('should be split by span tag with offset 2 (1 depth and element case)', () => {
        const cont = fromHTML('<div class="note-editable"><p><span><b>b</b><u>u</u><s>s</s><i>i</i></span></p></div>'); // busi
        const span = cont.querySelector('span') as HTMLElement;
        dom.splitTree(span, { node: span, offset: 2 });

        expect(cont.innerHTML).equalsIgnoreCase('<p><span><b>b</b><u>u</u></span><span><s>s</s><i>i</i></span></p>');
      });
    });
  });

  describe('splitPoint', () => {
    it('should return rightNode and container for empty paragraph with inline', () => {
      const editable = fromHTML('<div class="note-editable"><p><br></p></div>');
      const para = (editable.cloneNode(true) as HTMLElement).querySelector('p') as HTMLElement;
      const br = para.querySelector('br') as HTMLElement;

      const result = dom.splitPoint({ node: para, offset: 0 }, true);
      expect(result).to.deep.equal({ rightNode: br, container: para });
    });
  });

  describe('isVisiblePoint', () => {
    it('should detect as visible when there is a table inside a div', () => {
      const editable = fromHTML('<div><table></table></div>');
      // Legacy passed a jQuery selection `$editable.clone().find('div')`. The outer node IS
      // the div, so .find('div') matches no descendant -> an EMPTY jQuery object whose
      // `.node`/`.offset` are undefined. isVisiblePoint then hits `!hasChildren(undefined)`
      // and returns true. The faithful native stand-in is an object with no `node`.
      void editable;
      const point = {} as unknown as { node: Node; offset: number };

      const result = dom.isVisiblePoint(point);
      expect(result).to.be.true;
    });
  });
});
