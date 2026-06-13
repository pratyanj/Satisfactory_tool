/**
 * download_building_images.mjs
 *
 * Self-hosts building (and any missing machine) icons into public/images/<id>.png.
 *
 * Primary source: the SatisfactoryTools icon set on GitHub (raw CDN, no rate
 * limit, keyed by slug = className lowercased with '-'). It covers every
 * building including architecture (walls/ramps/roofs) the wiki lacks:
 *   .../www/assets/images/items/<slug>_256.png
 * Fallback: the Satisfactory wiki URL stored in data/buildings.json.
 *
 * Re-downloads all buildings for a consistent icon set; if SatisfactoryTools
 * 404s for one we already have, the existing file is kept.
 *
 *   node scripts/download_building_images.mjs
 */
import { writeFile, stat, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'images');
const CONCURRENCY = 8;
const STOOLS = 'https://raw.githubusercontent.com/greeny/SatisfactoryTools/master/www/assets/images/items';

const buildings = JSON.parse(readFileSync(join(ROOT, 'data', 'buildings.json'), 'utf-8'));
const machines = JSON.parse(readFileSync(join(ROOT, 'data', 'machines.json'), 'utf-8'));

const WIKI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'image/png,image/*;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const slugOf = className => className.toLowerCase().replace(/_/g, '-');

async function exists(p) {
  try { return (await stat(p)).size > 0; } catch { return false; }
}

/** Fetch a URL; return a Buffer if it's a real image, else null. Retries 429. */
async function fetchImage(url, headers) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try { res = await fetch(url, { redirect: 'follow', headers }); }
    catch { await sleep(800 * (attempt + 1)); continue; }
    if (res.status === 429) { await sleep(1500 * 2 ** attempt); continue; }
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length >= 300 ? buf : null;
  }
  return null;
}

async function process(id, className, wikiUrl) {
  const dest = join(OUT_DIR, `${id}.png`);
  // 1. Primary: SatisfactoryTools by slug.
  if (className) {
    const buf = await fetchImage(`${STOOLS}/${slugOf(className)}_256.png`);
    if (buf) { await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, buf); return 'stools'; }
  }
  // 2. Keep an existing local file rather than refetching the wiki.
  if (await exists(dest)) return 'skip';
  // 3. Fallback: wiki.
  if (wikiUrl) {
    const buf = await fetchImage(wikiUrl, WIKI_HEADERS);
    if (buf) { await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, buf); return 'wiki'; }
  }
  return 'missing';
}

async function run() {
  const jobs = Object.values(buildings).map(b => ({ id: b.id, className: b.className, wikiUrl: b.imageUrl }));
  for (const m of Object.values(machines)) {
    if (!(await exists(join(OUT_DIR, `${m.id}.png`)))) jobs.push({ id: m.id, className: null, wikiUrl: m.imageUrl });
  }

  const counts = { stools: 0, wiki: 0, skip: 0, missing: 0 };
  let next = 0;
  const total = jobs.length;
  console.log(`Downloading ${total} icons (SatisfactoryTools primary, wiki fallback)…`);

  async function worker() {
    while (next < jobs.length) {
      const j = jobs[next++];
      try { counts[await process(j.id, j.className, j.wikiUrl)]++; } catch { counts.missing++; }
      const done = counts.stools + counts.wiki + counts.skip + counts.missing;
      if (done % 50 === 0 || done === total) {
        console.log(`  ${done}/${total}  stools=${counts.stools} wiki=${counts.wiki} keep=${counts.skip} missing=${counts.missing}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone — satisfactorytools=${counts.stools} wiki=${counts.wiki} kept=${counts.skip} missing=${counts.missing}`);
}

run();
