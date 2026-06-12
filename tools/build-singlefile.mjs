#!/usr/bin/env node
// Bundles the multi-file game in docs/ into a single self-contained
// ../cubeworld.html that runs from file:// with no server and no internet.
//
// Usage:  node tools/build-singlefile.mjs
// Requires esbuild (uses a local install if present, otherwise `npx esbuild`).

import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'docs/js/main.js');
const threePath = join(root, 'docs/vendor/three.module.js');
const out = mkdtempSync(join(tmpdir(), 'cw-')) + '/bundle.js';

function runEsbuild() {
  const args = [
    entry, '--bundle', '--format=esm', '--minify', '--legal-comments=none',
    `--alias:three=${threePath}`, `--outfile=${out}`,
  ];
  const local = join(root, 'node_modules/.bin/esbuild');
  try {
    if (existsSync(local)) execFileSync(local, args, { stdio: 'inherit' });
    else execFileSync('esbuild', args, { stdio: 'inherit' });
  } catch {
    console.log('• esbuild not found locally, falling back to `npx esbuild`…');
    execFileSync('npx', ['--yes', 'esbuild@0.21.5', ...args], { stdio: 'inherit' });
  }
}

runEsbuild();

let html = readFileSync(join(root, 'docs/index.html'), 'utf8');
const css = readFileSync(join(root, 'docs/styles.css'), 'utf8');
let js = readFileSync(out, 'utf8');

// keep a stray "</script>" in the JS from terminating the tag early
js = js.replace(/<\/script>/gi, '<\\/script>');

// NOTE: replacement FUNCTIONS are required — the minified bundle contains
// "$`", "$'", "$&" etc. which are special patterns in a string replacement.
html = html.replace(/<link rel="stylesheet" href="styles\.css" \/>/, () => `<style>\n${css}\n</style>`);
html = html.replace(
  /<script type="importmap">[\s\S]*?<\/script>\s*<script type="module" src="js\/main\.js"><\/script>/,
  () => `<script type="module">\n${js}\n</script>`
);
html = html.replace('<head>', '<head>\n  <!-- Cubeworld — single-file build. Just open this file in a browser. -->');

const dest = join(root, 'cubeworld.html');
writeFileSync(dest, html);
console.log(`✓ wrote ${dest} (${(html.length / 1024).toFixed(0)} KB, self-contained)`);
