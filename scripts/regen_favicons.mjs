/**
 * regen_favicons.mjs
 *
 * The favicon badge sat inside a large transparent margin, so it shrank to a
 * tiny mark in the browser tab. This trims the transparent border and rebuilds
 * every favicon so the ST badge fills the square (edge-to-edge), then rebuilds
 * favicon.ico from the 16/32/48 PNGs.
 *
 * Uses headless Chrome's canvas (no native image deps). Needs the dev server up.
 *   node scripts/regen_favicons.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'logo', 'favicons');
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3001';
const SRC = '/logo/favicons/android-chrome-512x512.png';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9270;
const MARGIN = 0.03; // 3% breathing room — badge fills ~94% of the square

// filename -> pixel size
const TARGETS = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon-48x48.png': 48,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
  'apple-touch-icon.png': 180,
  'apple-touch-icon-180x180.png': 180,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = async p => (await fetch(`http://localhost:${PORT}${p}`)).json();

async function main() {
  const userDir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDir}`, '--remote-allow-origins=*', '--no-first-run', `${ORIGIN}/`]);
  try {
    let target;
    for (let i = 0; i < 60; i++) { try { const l = await getJSON('/json/list'); target = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (target) break; } catch {} await sleep(300); }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0; const pending = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
    await new Promise(r => (ws.onopen = r));
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Runtime.enable'); await sleep(1500);

    const expr = `(async () => {
      const img = new Image();
      img.src = ${JSON.stringify(SRC)};
      await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, W, H).data;
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
        if (d[(y * W + px) * 4 + 3] > 16) { if (px < minX) minX = px; if (px > maxX) maxX = px; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      const targets = ${JSON.stringify(TARGETS)};
      const out = {};
      for (const [name, size] of Object.entries(targets)) {
        const cc = document.createElement('canvas'); cc.width = size; cc.height = size;
        const cx = cc.getContext('2d');
        cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
        const margin = Math.round(size * ${MARGIN});
        const inner = size - margin * 2;
        const scale = Math.min(inner / bw, inner / bh);
        const dw = bw * scale, dh = bh * scale;
        cx.drawImage(img, minX, minY, bw, bh, (size - dw) / 2, (size - dh) / 2, dw, dh);
        out[name] = cc.toDataURL('image/png');
      }
      return JSON.stringify({ bbox: [minX, minY, bw, bh, W, H], out });
    })()`;

    const r = (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
    const { bbox, out } = JSON.parse(r);
    console.log(`source ${bbox[4]}x${bbox[5]} → badge bbox ${bbox[2]}x${bbox[3]} at (${bbox[0]},${bbox[1]})`);

    const pngs = {};
    for (const [name, dataUrl] of Object.entries(out)) {
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      writeFileSync(join(OUT, name), buf);
      pngs[name] = buf;
      console.log(`  wrote ${name} (${buf.length}b)`);
    }

    // Rebuild favicon.ico from the 16/32/48 PNGs (PNG-in-ICO, supported everywhere).
    const icoSizes = [['favicon-16x16.png', 16], ['favicon-32x32.png', 32], ['favicon-48x48.png', 48]];
    const count = icoSizes.length;
    const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
    const entries = []; const blobs = [];
    let offset = 6 + count * 16;
    for (const [name, size] of icoSizes) {
      const png = pngs[name];
      const e = Buffer.alloc(16);
      e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1);
      e.writeUInt8(0, 2); e.writeUInt8(0, 3); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
      e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
      entries.push(e); blobs.push(png); offset += png.length;
    }
    const ico = Buffer.concat([header, ...entries, ...blobs]);
    writeFileSync(join(OUT, 'favicon.ico'), ico);
    writeFileSync(join(ROOT, 'public', 'logo', 'favicon.ico'), ico);
    console.log(`  wrote favicon.ico (${ico.length}b, ${count} sizes)`);

    ws.close();
  } finally {
    chrome.kill();
  }
  console.log('Done.');
}
main().catch(e => { console.error(e); process.exit(1); });
