// Copies the web fonts from their official npm packages into public/fonts, so the site serves
// them itself instead of loading them from a CDN. Run after updating `pretendard` or
// `wanted-sans` in package.json: `pnpm fonts:vendor`. The folder names carry the version, so the
// files can be cached forever (see next.config.ts).
//
// Both fonts are SIL Open Font License 1.1; the license text is in each CSS file's header.
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = (pkg) =>
  JSON.parse(readFileSync(join(root, 'node_modules', pkg, 'package.json'), 'utf8')).version;

const FONTS = [
  {
    pkg: 'pretendard',
    from: 'dist/web/variable',
    files: ['pretendardvariable-dynamic-subset.css', 'woff2-dynamic-subset'],
  },
  {
    pkg: 'wanted-sans',
    from: 'fonts/webfonts/variable/split',
    files: ['WantedSansVariable.css', 'woff2'],
  },
];

rmSync(join(root, 'public/fonts'), { recursive: true, force: true });
for (const font of FONTS) {
  const out = join(root, 'public/fonts', `${font.pkg}-${version(font.pkg)}`);
  for (const file of font.files) {
    cpSync(join(root, 'node_modules', font.pkg, font.from, file), join(out, file), {
      recursive: true,
    });
  }
  console.log(`vendored ${font.pkg}@${version(font.pkg)} → ${out}`);
}
