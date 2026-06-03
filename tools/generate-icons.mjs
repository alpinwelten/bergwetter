// generate-icons.mjs — erzeugt alle App-Icon-PNGs aus icons/icon.svg.
// Methode: Rendering per Headless-Chrome (kein npm-Dependency nötig).
// Voraussetzung: Google Chrome installiert, oder Umgebungsvariable CHROME
// zeigt auf das Browser-Binary. Aufruf:  node tools/generate-icons.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = join(root, 'icons', 'icon.svg');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Apple-Touch + PWA + Favicon-Größen
const SIZES = [1024, 512, 192, 180, 167, 152, 120, 32];
const tmp = mkdtempSync(join(tmpdir(), 'bw-icons-'));

function render(html, out, w, h) {
  const f = join(tmp, 'r.html');
  writeFileSync(f, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, `--screenshot=${out}`, 'file://' + f,
  ], { stdio: 'ignore' });
}

for (const n of SIZES) {
  render(
    `<!doctype html><meta charset=utf-8><body style="margin:0"><img src="file://${svg}" width=${n} height=${n} style="display:block"></body>`,
    join(root, 'icons', `icon-${n}.png`), n, n);
  console.log(`icon-${n}.png`);
}

// Maskable: icon.svg ist full-bleed (firn-Verlauf bis zum Rand, Motiv in der Safe-Zone) → 1:1 rendern.
render(
  `<!doctype html><meta charset=utf-8><body style="margin:0"><img src="file://${svg}" width=512 height=512 style="display:block"></body>`,
  join(root, 'icons', 'icon-maskable-512.png'), 512, 512);
console.log('icon-maskable-512.png');
