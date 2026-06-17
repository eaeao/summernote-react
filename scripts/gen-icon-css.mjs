/*
 * gen-icon-css — generate packages/react/src/styles/summernote-icons.css from the legacy glyph map
 * (src/styles/summernote/font.scss) + the pre-built webfont (copied into src/styles/fonts/). All
 * themes share this note-icon-* font. Run: node scripts/gen-icon-css.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const scss = readFileSync('src/styles/summernote/font.scss', 'utf8');
const re = /\.note-icon-([a-z0-9-]+)::before\s*\{\s*content:\s*"(\\[0-9a-fA-F]+)";/g;
const rules = [];
let m;
while ((m = re.exec(scss)) !== null) {
  rules.push(`.note-icon-${m[1]}::before { content: "${m[2]}"; }`);
}

const header = `/*
 * summernote icon font — the shared note-icon-* glyphs (pre-built webfont copied from the legacy
 * src/font; @font-face + glyph map extracted from src/styles/summernote/font.scss by
 * scripts/gen-icon-css.mjs). Import once alongside the theme CSS:
 *   import '@summernote/react/icons.css';
 * Every theme shares this font.
 */
@font-face {
  font-family: "summernote";
  font-style: normal;
  font-weight: 400;
  font-display: auto;
  src: url("./fonts/summernote.woff2") format("woff2"),
       url("./fonts/summernote.woff") format("woff");
}
[class^="note-icon"]::before,
[class*=" note-icon"]::before {
  display: inline-block;
  font-family: "summernote";
  font-style: normal;
  font-weight: normal;
  font-size: inherit;
  text-rendering: auto;
  vertical-align: middle;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  speak: none;
}
`;

writeFileSync('packages/react/src/styles/summernote-icons.css', header + '\n' + rules.join('\n') + '\n', 'utf8');
console.log('wrote summernote-icons.css with', rules.length, 'glyphs');
