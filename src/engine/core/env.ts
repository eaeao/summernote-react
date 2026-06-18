/**
 * core.env — engine-accurate platform/agent detection + feature-detect flags.
 *
 * Classifies engine (Blink/WebKit/Gecko) and OS (iOS/Android/Samsung) precisely, so the WebKit/iOS
 * caret workarounds key off correct flags (otherwise the guards no-op on Safari).
 *
 * Rule: branch touch/geometry behavior on the feature-detect flags
 * (hasPointerEvent/hasVisualViewport/isCoarsePointer), never on isSafari/isBlink. Engine flags
 * gate only documented browser-bug workarounds (e.g. WebKit caret ejection).
 *
 * `detectEnv(nav, win)` is a pure factory taking navigator/window-like objects — the injection
 * seam so tests can exercise each branch without a real device.
 */

export interface NavigatorLike {
  readonly userAgent?: string;
  readonly platform?: string;
  readonly appVersion?: string;
  readonly maxTouchPoints?: number;
  readonly virtualKeyboard?: unknown;
}

export interface WindowLike {
  readonly PointerEvent?: unknown;
  readonly visualViewport?: unknown;
  readonly matchMedia?: (query: string) => { matches: boolean };
  readonly document?: Document;
}

export interface EnvFlags {
  // platform
  readonly isMac: boolean;
  readonly isIOS: boolean;
  readonly isAndroid: boolean;
  // engine (mutually exclusive intent: exactly one of isBlink/isAppleWebKit/isFF/isMSIE is the
  // primary engine for a given UA; isSafari/isSamsungInternet/isEdge refine the Blink/WebKit ones)
  readonly isBlink: boolean;
  readonly isAppleWebKit: boolean;
  readonly isSafari: boolean;
  readonly isFF: boolean;
  readonly isMSIE: boolean;
  readonly isEdge: boolean;
  readonly isSamsungInternet: boolean;
  readonly browserVersion: number | undefined;
  // feature detection (branch touch/geometry on THESE)
  readonly hasPointerEvent: boolean;
  readonly hasVisualViewport: boolean;
  readonly hasVirtualKeyboard: boolean;
  readonly isCoarsePointer: boolean;
  readonly maxTouchPoints: number;
  readonly isSupportTouch: boolean;
  // misc
  readonly isW3CRangeSupport: boolean;
  readonly inputEventName: string;
}

export function detectEnv(nav: NavigatorLike, win: WindowLike): EnvFlags {
  const ua = nav.userAgent ?? '';
  const platform = nav.platform ?? '';
  const maxTouchPoints = nav.maxTouchPoints ?? 0;

  // iPadOS 13+ reports as desktop Safari (platform MacIntel) — disambiguate via touch points.
  const isIOS = /iP(hone|od|ad)/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  const isMSIE = /MSIE|Trident/i.test(ua);
  const isFF = /\b(Firefox|FxiOS)\//.test(ua) && !/Seamonkey/i.test(ua);
  const isSamsungInternet = /SamsungBrowser/i.test(ua);
  const isEdge = /\bEdg(e|A|iOS)?\//.test(ua); // Chromium Edge (Edg/), Android (EdgA), iOS (EdgiOS)

  // Any Chromium UA token. CriOS = Chrome-on-iOS, which is actually WebKit underneath.
  const hasChromeToken = /\b(Chrome|Chromium)\//.test(ua);
  const isIosWrapper = /\b(CriOS|FxiOS|EdgiOS)\//.test(ua); // Chromium/FF/Edge skins that run on WebKit

  // Blink = Chromium engine on a non-iOS platform (Apple forbids non-WebKit engines on iOS).
  const isBlink = !isIOS && !isMSIE && !isFF && (hasChromeToken || isSamsungInternet || isEdge);
  // Apple WebKit = iOS (ALWAYS WebKit, even Firefox/Chrome skins) or a non-Blink desktop WebKit
  // (Safari). isFF is kept for keymap/Gecko quirks but must not exclude FxiOS from the engine flag.
  const isAppleWebKit = !isMSIE && !isBlink && (isIOS || (/AppleWebKit/.test(ua) && !isFF));
  // Safari proper = WebKit, the Safari token present, and NOT a Chrome/FF/Edge iOS wrapper.
  const isSafari = isAppleWebKit && /Safari\//.test(ua) && !hasChromeToken && !isIosWrapper;

  let browserVersion: number | undefined;
  if (isMSIE) {
    const m1 = /MSIE (\d+[.]\d+)/.exec(ua);
    if (m1 && m1[1]) {
      browserVersion = parseFloat(m1[1]);
    }
    const m2 = /Trident\/.*rv:([0-9]{1,}[.0-9]{0,})/.exec(ua);
    if (m2 && m2[1]) {
      browserVersion = parseFloat(m2[1]);
    }
  }

  const isMac = /Mac/.test(platform) || /Mac OS X/.test(ua) || isIOS;

  const isCoarsePointer =
    typeof win.matchMedia === 'function' ? win.matchMedia('(pointer: coarse)').matches : maxTouchPoints > 0;
  const isSupportTouch = 'ontouchstart' in win || maxTouchPoints > 0;

  return {
    isMac,
    isIOS,
    isAndroid,
    isBlink,
    isAppleWebKit,
    isSafari,
    isFF,
    isMSIE,
    isEdge,
    isSamsungInternet,
    browserVersion,
    hasPointerEvent: typeof win.PointerEvent !== 'undefined',
    hasVisualViewport: win.visualViewport !== undefined && win.visualViewport !== null,
    hasVirtualKeyboard: nav.virtualKeyboard !== undefined && nav.virtualKeyboard !== null,
    isCoarsePointer,
    maxTouchPoints,
    isSupportTouch,
    isW3CRangeSupport: !!win.document && !!win.document.createRange,
    // [workaround] IE has no input event for contentEditable; isolated behind isMSIE.
    inputEventName: isMSIE ? 'DOMCharacterDataModified DOMSubtreeModified DOMNodeInserted' : 'input',
  };
}

// --- font detection (real-document only; unchanged from the legacy port) ---

const genericFontFamilies = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];

function validFontName(fontName: string): string {
  return !genericFontFamilies.includes(fontName.toLowerCase()) ? `'${fontName}'` : fontName;
}

function createIsFontInstalledFunc(): (fontName: string) => boolean {
  const testText = 'mw';
  const fontSize = '20px';
  const canvasWidth = 40;
  const canvasHeight = 20;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  context.textAlign = 'center';
  context.fillStyle = 'black';
  context.textBaseline = 'middle';

  function getPxInfo(font: string, testFontName: string): string {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.font = fontSize + ' ' + validFontName(font) + ', "' + testFontName + '"';
    context.fillText(testText, canvasWidth / 2, canvasHeight / 2);
    return context.getImageData(0, 0, canvasWidth, canvasHeight).data.join('');
  }

  return (fontName: string): boolean => {
    const testFontName = fontName === 'Comic Sans MS' ? 'Courier New' : 'Comic Sans MS';
    return getPxInfo(testFontName, testFontName) !== getPxInfo(fontName, testFontName);
  };
}

const flags = detectEnv(typeof navigator !== 'undefined' ? navigator : {}, typeof window !== 'undefined' ? window : {});

const env = {
  ...flags,
  isFontInstalled: typeof document !== 'undefined' ? createIsFontInstalledFunc() : (): boolean => false,
  genericFontFamilies,
  validFontName,
};

export default env;
