/**
 * Codeview HTML purification. The codeview textarea is attacker-influenceable, so its content must
 * be filtered before it is written back to the editable (the codeview XSS gate). Strips
 * script/style/object/embed/frame(set)/meta/base/link/title/textarea/applet/xml tags and removes
 * every <iframe> whose src is not in the whitelist.
 *
 * NOTE: this is the codeview boundary only. The controlled `value` prop, setCode(), and the initial
 * seed are developer-supplied (trusted) and are not purified.
 */

export interface CodeviewFilterOptions {
  codeviewFilter: boolean;
  codeviewFilterRegex: RegExp;
  codeviewIframeFilter: boolean;
  codeviewIframeWhitelistSrc: readonly string[];
  codeviewIframeWhitelistSrcBase: readonly string[];
}

export const defaultCodeviewFilter: CodeviewFilterOptions = {
  codeviewFilter: true,
  codeviewFilterRegex:
    /<\/*(?:applet|b(?:ase|gsound|link)|embed|frame(?:set)?|ilayer|l(?:ayer|ink)|meta|object|s(?:cript|tyle)|t(?:itle|extarea)|xml)[^>]*?>/gi,
  codeviewIframeFilter: true,
  codeviewIframeWhitelistSrc: [],
  codeviewIframeWhitelistSrcBase: [
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'www.facebook.com',
    'vine.co',
    'instagram.com',
    'player.vimeo.com',
    'www.dailymotion.com',
    'player.youku.com',
    'jumpingbean.tv',
    'v.qq.com',
  ],
};

export function purifyCodeview(value: string, options: Partial<CodeviewFilterOptions> = {}): string {
  const o = { ...defaultCodeviewFilter, ...options };
  if (!o.codeviewFilter) {
    return value;
  }
  value = value.replace(o.codeviewFilterRegex, '');
  if (o.codeviewIframeFilter) {
    const whitelist = [...o.codeviewIframeWhitelistSrc, ...o.codeviewIframeWhitelistSrcBase];
    value = value.replace(/(<iframe.*?>.*?(?:<\/iframe>)?)/gi, (tag) => {
      // remove if the src attribute is duplicated (smuggling)
      if (/<.+src(?==?('|"|\s)?)[\s\S]+src(?=('|"|\s)?)[^>]*?>/i.test(tag)) {
        return '';
      }
      for (const src of whitelist) {
        const escaped = src.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        if (new RegExp('src="(https?:)?//' + escaped + '/(.+)"').test(tag)) {
          return tag; // trusted src
        }
      }
      return '';
    });
  }
  return value;
}

/** reject dangerous URL schemes in link hrefs (hardening beyond the legacy editor). */
const UNSAFE_SCHEME = /^\s*(?:javascript|vbscript|data)\s*:/i;
export function isSafeLinkUrl(url: string): boolean {
  return !UNSAFE_SCHEME.test(url);
}
