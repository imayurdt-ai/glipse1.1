/**
 * After tsc compiles preload.ts -> dist-electron/preload.js,
 * rename it to preload.cjs so Node respects it as CommonJS
 * even when package.json has "type":"module".
 */
const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, '..', 'dist-electron', 'preload.js');
const dest = path.join(__dirname, '..', 'dist-electron', 'preload.cjs');

if (!fs.existsSync(src)) {
  console.error('[rename-preload] ERROR: not found:', src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
fs.unlinkSync(src);
console.log('[rename-preload] preload.js -> preload.cjs OK');
