/**
 * core.func — utilities for higher-order function arguments.
 * Ported 1:1 from src/js/core/func.js (jQuery removed: rect2bnd uses native scroll offsets).
 */

type Predicate<T> = (item: T) => boolean;

export interface Bounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RectLike {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

function eq<T>(itemA: T): Predicate<T> {
  return (itemB: T): boolean => itemA === itemB;
}

function eq2<T>(itemA: T, itemB: T): boolean {
  return itemA === itemB;
}

function peq2<K extends string>(propName: K) {
  return (itemA: Record<K, unknown>, itemB: Record<K, unknown>): boolean =>
    itemA[propName] === itemB[propName];
}

function ok(): boolean {
  return true;
}

function fail(): boolean {
  return false;
}

function not<A extends unknown[]>(f: (...args: A) => boolean): (...args: A) => boolean {
  return (...args: A): boolean => !f(...args);
}

function and<T>(fA: Predicate<T>, fB: Predicate<T>): Predicate<T> {
  return (item: T): boolean => fA(item) && fB(item);
}

function self<T>(a: T): T {
  return a;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function invoke(obj: Record<string, (...args: any[]) => any>, method: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]): any => obj[method].apply(obj, args);
}

let idCounter = 0;

/** reset the globally-unique id counter. */
function resetUniqueId(): void {
  idCounter = 0;
}

/** generate a globally-unique id (optionally prefixed). */
function uniqueId(prefix?: string): string {
  const id = String(++idCounter);
  return prefix ? prefix + id : id;
}

/**
 * returns bnd (bounds) from a rect, translated by the document scroll offsets.
 * [battle-patch ac5460e0] guard against a missing rect (stops the AirMode error).
 */
function rect2bnd(rect: RectLike | null | undefined): Bounds {
  if (!rect) {
    return { top: 0, left: 0, width: 0, height: 0 };
  }
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

/** returns a copy of the object with keys and values swapped. */
function invertObject(obj: Record<string, string>): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      inverted[obj[key]] = key;
    }
  }
  return inverted;
}

function namespaceToCamel(namespace: string, prefix = ''): string {
  return (
    prefix +
    namespace
      .split('.')
      .map((name) => name.substring(0, 1).toUpperCase() + name.substring(1))
      .join('')
  );
}

/**
 * Returns a debounced function that fires after it stops being called for `wait` ms.
 * With `immediate`, fires on the leading edge instead.
 */
function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
  immediate?: boolean,
): (...args: A) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: A): void {
    const later = (): void => {
      timeout = null;
      if (!immediate) {
        fn.apply(this, args);
      }
    };
    const callNow = immediate === true && timeout === null;
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
    if (callNow) {
      fn.apply(this, args);
    }
  };
}

function isValidUrl(url: string): boolean {
  const expression =
    /[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi;
  return expression.test(url);
}

const func = {
  eq,
  eq2,
  peq2,
  ok,
  fail,
  self,
  not,
  and,
  invoke,
  resetUniqueId,
  uniqueId,
  rect2bnd,
  invertObject,
  namespaceToCamel,
  debounce,
  isValidUrl,
};

export default func;
