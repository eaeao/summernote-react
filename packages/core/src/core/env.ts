/**
 * core.env — object which checks platform and agent.
 * Ported 1:1 from src/js/core/env.js (jQuery removed: $.inArray -> Array.includes).
 */

/**
 * returns whether font is installed or not.
 *
 * @param fontName
 * @return
 */
const genericFontFamilies = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];

function validFontName(fontName: string): string {
  return (!genericFontFamilies.includes(fontName.toLowerCase())) ? `'${fontName}'` : fontName;
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
    // Get pixel information
    const pxInfo = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
    return pxInfo.join('');
  }

  return (fontName: string): boolean => {
    const testFontName = fontName === 'Comic Sans MS' ? 'Courier New' : 'Comic Sans MS';
    const testInfo = getPxInfo(testFontName, testFontName);
    const fontInfo = getPxInfo(fontName, testFontName);
    return testInfo !== fontInfo;
  };
}

const userAgent = navigator.userAgent;
const isMSIE = /MSIE|Trident/i.test(userAgent);
let browserVersion: number | undefined;
if (isMSIE) {
  let matches = /MSIE (\d+[.]\d+)/.exec(userAgent);
  if (matches) {
    browserVersion = parseFloat(matches[1]);
  }
  matches = /Trident\/.*rv:([0-9]{1,}[.0-9]{0,})/.exec(userAgent);
  if (matches) {
    browserVersion = parseFloat(matches[1]);
  }
}

const isEdge = /Edge\/\d+/.test(userAgent);

const isSupportTouch =
  (('ontouchstart' in window) ||
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ((navigator as any).MaxTouchPoints > 0) ||
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ((navigator as any).msMaxTouchPoints > 0));

// [workaround] IE doesn't have input events for contentEditable
// - see: https://goo.gl/4bfIvA
const inputEventName = (isMSIE) ? 'DOMCharacterDataModified DOMSubtreeModified DOMNodeInserted' : 'input';

/**
 * @class core.env
 *
 * Object which check platform and agent
 *
 * @singleton
 * @alternateClassName env
 */
const env = {
  isMac: navigator.appVersion.indexOf('Mac') > -1,
  isMSIE,
  isEdge,
  isFF: !isEdge && /firefox/i.test(userAgent),
  isPhantom: /PhantomJS/i.test(userAgent),
  isWebkit: !isEdge && /webkit/i.test(userAgent),
  isChrome: !isEdge && /chrome/i.test(userAgent),
  isSafari: !isEdge && /safari/i.test(userAgent) && (!/chrome/i.test(userAgent)),
  browserVersion,
  isSupportTouch,
  isFontInstalled: createIsFontInstalledFunc(),
  isW3CRangeSupport: !!document.createRange,
  inputEventName,
  genericFontFamilies,
  validFontName,
};

export default env;
