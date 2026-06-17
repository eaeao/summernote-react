/**
 * core.lists — array/collection utilities.
 * Ported 1:1 from src/js/core/lists.js (no jQuery).
 */
import func from './func';

/** returns the first item of an array. */
function head<T>(array: T[]): T {
  return array[0];
}

/** returns the last item of an array. */
function last<T>(array: T[]): T {
  return array[array.length - 1];
}

/** returns everything but the last entry of the array. */
function initial<T>(array: T[]): T[] {
  return array.slice(0, array.length - 1);
}

/** returns the rest of the items in an array. */
function tail<T>(array: T[]): T[] {
  return array.slice(1);
}

/** returns the first item matching the predicate. */
function find<T>(array: T[], pred: (item: T) => boolean): T | undefined {
  for (let idx = 0, len = array.length; idx < len; idx++) {
    const item = array[idx];
    if (pred(item)) {
      return item;
    }
  }
  return undefined;
}

/** returns true if every value passes the predicate. */
function all<T>(array: T[], pred: (item: T) => boolean): boolean {
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (!pred(array[idx])) {
      return false;
    }
  }
  return true;
}

/** returns true if the value is present in the list (Array or DOMTokenList). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function contains(array: any, item: unknown): boolean {
  if (array && array.length && item) {
    if (array.indexOf) {
      return array.indexOf(item) !== -1;
    } else if (array.contains) {
      // `DOMTokenList` has no `.indexOf` but implements `.contains`
      return array.contains(item);
    }
  }
  return false;
}

/** sum of a list, optionally mapped by `fn`. */
function sum<T>(array: T[], fn: (v: T) => number = func.self as (v: T) => number): number {
  return array.reduce((memo, v) => memo + fn(v), 0);
}

/** returns a real Array copy of an array-like collection (e.g. node.childNodes). */
function from<T>(collection: ArrayLike<T>): T[] {
  const result: T[] = [];
  const length = collection.length;
  let idx = -1;
  while (++idx < length) {
    result[idx] = collection[idx];
  }
  return result;
}

/** returns whether the list is empty. */
function isEmpty(array: ArrayLike<unknown> | null | undefined): boolean {
  return !array || !array.length;
}

/** clusters adjacent elements by a predicate. */
function clusterBy<T>(array: T[], fn: (a: T, b: T) => boolean): T[][] {
  if (!array.length) {
    return [];
  }
  const aTail = tail(array);
  return aTail.reduce<T[][]>(
    (memo, v) => {
      const aLast = last(memo);
      if (fn(last(aLast), v)) {
        aLast[aLast.length] = v;
      } else {
        memo[memo.length] = [v];
      }
      return memo;
    },
    [[head(array)]],
  );
}

/** returns a copy of the array with all falsy values removed. */
function compact<T>(array: T[]): T[] {
  const aResult: T[] = [];
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (array[idx]) {
      aResult.push(array[idx]);
    }
  }
  return aResult;
}

/** returns a duplicate-free copy of the array. */
function unique<T>(array: T[]): T[] {
  const results: T[] = [];
  for (let idx = 0, len = array.length; idx < len; idx++) {
    if (!contains(results, array[idx])) {
      results.push(array[idx]);
    }
  }
  return results;
}

/** returns the next item after `item`, or null. */
function next<T>(array: T[], item: T): T | null {
  if (array && array.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 ? null : array[idx + 1];
  }
  return null;
}

/** returns the previous item before `item`, or null. */
function prev<T>(array: T[], item: T): T | null {
  if (array && array.length && item) {
    const idx = array.indexOf(item);
    return idx === -1 ? null : array[idx - 1];
  }
  return null;
}

const lists = {
  head,
  last,
  initial,
  tail,
  prev,
  next,
  find,
  contains,
  all,
  sum,
  from,
  isEmpty,
  clusterBy,
  compact,
  unique,
};

export default lists;
