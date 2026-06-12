/**
 * download_collectible_images.mjs
 *
 * Downloads the collectible / artifact item icons used by the map's
 * CollectibleLayer into public/images/<key>.png, pulling from the
 * Satisfactory wiki via Special:FilePath (follows the redirect to the
 * real file, no fragile hashed thumb URLs).
 *
 * Power-slug icons (blue/yellow/purple_power_slug.png) already exist and
 * are skipped. Re-runnable: existing files are left alone.
 *
 *   node scripts/download_collectible_images.mjs
 */
import { writeFile, stat, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'images');
const WIKI = 'https://satisfactory.wiki.gg/wiki/Special:FilePath/';

// local snake_case filename  ->  wiki File: name
const TARGETS = {
  somersloop:    'Somersloop.png',
  mercer_sphere: 'Mercer Sphere.png',
  hard_drive:    'Hard Drive.png',
  paleberry:     'Paleberry.png',
  beryl_nut:     'Beryl Nut.png',
  bacon_agaric:  'Bacon Agaric.png',
};

async function exists(p) {
  try { return (await stat(p)).size > 0; } catch { return false; }
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0, skip = 0, fail = 0;
  for (const [key, wikiName] of Object.entries(TARGETS)) {
    const dest = join(OUT_DIR, `${key}.png`);
    if (await exists(dest)) { console.log(`skip  ${key}.png (exists)`); skip++; continue; }
    const url = WIKI + encodeURIComponent(wikiName).replace(/%20/g, '_');
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      // Force PNG — do NOT advertise webp/avif, or the wiki CDN content-
      // negotiates a webp body under our .png filename.
      'Accept': 'image/png,*/*;q=0.5',
    };
    try {
      let buf = null;
      // Retry on 429 (wiki rate limit) with exponential backoff.
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(url, { redirect: 'follow', headers });
        if (res.status === 429) {
          const wait = 2000 * 2 ** attempt;
          console.log(`  429 on ${key}, waiting ${wait / 1000}s…`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.startsWith('image/')) throw new Error(`HTTP ${res.status} ${ct}`);
        buf = Buffer.from(await res.arrayBuffer());
        break;
      }
      if (!buf) throw new Error('still rate-limited after retries');
      if (buf.length < 500) throw new Error(`too small (${buf.length}b)`);
      await writeFile(dest, buf);
      console.log(`ok    ${key}.png  (${(buf.length / 1024).toFixed(1)}KB)`);
      ok++;
    } catch (e) {
      console.warn(`FAIL  ${key}.png  <- ${wikiName}: ${e.message}`);
      fail++;
    }
    // Be polite between requests to avoid tripping the rate limiter.
    await new Promise(r => setTimeout(r, 800));
  }
  console.log(`\nDone — ok=${ok} skip=${skip} fail=${fail}`);
  if (fail) process.exitCode = 1;
}

run();
