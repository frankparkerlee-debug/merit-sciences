/**
 * Build hardening for next/font/google (Next 14.2).
 *
 * Google Fonts sometimes answers the build's stylesheet request with font
 * URLs that carry no file extension. Next's loader reads the extension with a
 * regex and crashes on those ("Cannot read properties of null (reading '1')"),
 * which failed several production builds on 2026-11-27. The font bytes are
 * woff2 either way (the loader asks as Chrome), so fall back to that instead
 * of crashing. Runs from postinstall; safe to run twice.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules/next/dist/compiled/@next/font/dist/google/loader.js');
const before = 'const ext = /\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1];';
const after = "const ext = (/\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl) || [null, 'woff2'])[1];";
try {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(after)) console.log('[patch-next-font] already applied');
  else if (src.includes(before)) { fs.writeFileSync(file, src.replace(before, after)); console.log('[patch-next-font] applied'); }
  else console.warn('[patch-next-font] loader changed, patch skipped');
} catch (err) {
  console.warn('[patch-next-font] skipped:', err.message);
}
