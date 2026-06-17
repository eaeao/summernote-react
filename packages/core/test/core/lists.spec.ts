import { describe, it, expect } from 'vitest';
import lists from '../../src/core/lists';

// Ported from test/base/core/lists.spec.js (1:1; the `from` test builds its DOM natively
// instead of via jQuery).
describe('base:core.lists', () => {
  describe('head', () => {
    it('should return the first element', () => {
      expect(lists.head([1, 2, 3])).to.be.equal(1);
    });
  });

  describe('last', () => {
    it('should return the last element', () => {
      expect(lists.last([1, 2, 3])).to.be.equal(3);
    });
  });

  describe('initial', () => {
    it('should exclude last element', () => {
      expect(lists.initial([1, 2, 3])).to.deep.equal([1, 2]);
    });
  });

  describe('tail', () => {
    it('should exclude first element', () => {
      expect(lists.tail([1, 2, 3])).to.deep.equal([2, 3]);
    });
  });

  function isEven(num: number): boolean {
    return num % 2 === 0;
  }

  describe('find', () => {
    it('should return first matched element', () => {
      expect(lists.find([1, 2, 3], isEven)).to.be.equal(2);
    });
  });

  describe('all', () => {
    it('should return false if all elements are not even', () => {
      expect(lists.all([1, 2, 3], isEven)).to.be.false;
    });

    it('should return true if all elements are even', () => {
      expect(lists.all([2, 4], isEven)).to.be.true;
    });
  });

  describe('contains', () => {
    it('should return false if the element is not contained', () => {
      expect(lists.contains([1, 2, 3], 4)).to.be.false;
    });

    it('should return true if the element is contained', () => {
      expect(lists.contains([1, 2, 4], 4)).to.be.true;
    });
  });

  describe('sum', () => {
    it('should return sum of all elements', () => {
      expect(lists.sum([1, 2, 3])).to.be.equal(6);
    });

    it('should return sum of all elements iterated', () => {
      const result = lists.sum([1, 2, 3], (v) => v * 2);
      expect(result).to.be.equal(12);
    });
  });

  describe('from', () => {
    it('should return an array of childNodes', () => {
      const cont = document.createElement('div');
      cont.innerHTML = '<b>b</b><u>u</u><s>s</s><i>i</i>'; // busi
      expect(lists.from(cont.childNodes)).to.deep.equal(Array.from(cont.childNodes));
    });
  });

  describe('clusterBy', () => {
    it('should cluster by equality 1', () => {
      const aaClustered = lists.clusterBy([1, 1, 2, 2, 3], (itemA, itemB) => itemA === itemB);
      expect(aaClustered).to.deep.equal([[1, 1], [2, 2], [3]]);
    });

    it('should cluster by equality 2', () => {
      const aaClustered = lists.clusterBy([1, 2, 2, 1, 3], (itemA, itemB) => itemA === itemB);
      expect(aaClustered).to.deep.equal([[1], [2, 2], [1], [3]]);
    });
  });

  describe('compact', () => {
    it('should remove all elements has false value', () => {
      expect(lists.compact([0, 1, false, 2, '', 3])).to.deep.equal([1, 2, 3]);
    });
  });

  describe('unique', () => {
    it('should return duplicate-free version of array', () => {
      expect(lists.unique([1, 2, 3, 3, 2, 1])).to.deep.equal([1, 2, 3]);
    });
  });
});
