/**
 * make_favicon.mjs — regenerate the favicon set from a source PNG using headless
 * Chrome's canvas (no ImageMagick/sharp needed). Writes PNG sizes + favicon.ico
 * into public/logo/favicons/.
 *
 *   node scripts/make_favicon.mjs "C:\\path\\to\\source.png"
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2];
if (!SRC) { console.error('Usage: node scripts/make_favicon.mjs <source.png>'); process.exit(1); }
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'logo', 'favicons');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9270;

const srcB64 = readFileSync(SRC).toString('base64');
const SIZES = [16, 32, 48, 64, 180, 192, 512];

const userDir = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`, '--remote-allow-origins=*', '--no-first-run', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = async p => (await fetch(`http://localhost:${PORT}${p}`)).json();

// ICO container wrapping PNG entries (supported by all modern browsers).
function buildIco(entries /* [{size, buf}] */) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + 16 * entries.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o);
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map(e => e.buf)]);
}

async function main() {
  let target;
  for (let i = 0; i < 60; i++) { try { const l = await getJSON('/json/list'); target = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (target) break; } catch {} await sleep(300); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r => (ws.onopen = r));
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');

  const expr = `(async () => {
    const img = new Image();
    img.src = 'data:image/png;base64,${srcB64}';
    await img.decode();
    const sizes = ${JSON.stringify(SIZES)};
    const out = { w: img.naturalWidth, h: img.naturalHeight, imgs: {} };
    for (const s of sizes) {
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const scale = Math.min(s / img.naturalWidth, s / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
      out.imgs[s] = c.toDataURL('image/png').split(',')[1];
    }
    return JSON.stringify(out);
  })()`;
  const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails || !res.result?.result?.value) { console.error('eval failed:', JSON.stringify(res.result?.exceptionDetails || res).slice(0, 400)); chrome.kill(); process.exit(1); }
  const data = JSON.parse(res.result.result.value);
  console.log(`source ${data.w}x${data.h}  →  generating ${SIZES.join(', ')}`);

  const bufs = {};
  for (const s of SIZES) bufs[s] = Buffer.from(data.imgs[s], 'base64');

  const writes = {
    'favicon-16x16.png': 16, 'favicon-32x32.png': 32, 'favicon-48x48.png': 48,
    'apple-touch-icon.png': 180, 'apple-touch-icon-180x180.png': 180,
    'android-chrome-192x192.png': 192, 'android-chrome-512x512.png': 512,
  };
  for (const [name, s] of Object.entries(writes)) {
    writeFileSync(join(OUT, name), bufs[s]);
    console.log('  wrote', name, `(${bufs[s].length}b)`);
  }
  const ico = buildIco([{ size: 16, buf: bufs[16] }, { size: 32, buf: bufs[32] }, { size: 48, buf: bufs[48] }, { size: 64, buf: bufs[64] }]);
  writeFileSync(join(OUT, 'favicon.ico'), ico);
  console.log('  wrote favicon.ico', `(${ico.length}b, 16/32/48/64)`);

  ws.close(); chrome.kill(); process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
