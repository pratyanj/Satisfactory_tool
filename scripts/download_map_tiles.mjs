/**
 * download_map_tiles.mjs
 *
 * Self-hosts the Satisfactory world-map tile pyramid used by
 * rockfactory/satisfactory-logistics. Downloads every {z}/{x}/{y}.webp tile
 * for zoom levels MIN_ZOOM..MAX_ZOOM from their public CDN into
 * public/map/v2/ so the app no longer depends on an external host.
 *
 * Re-runnable: already-downloaded tiles are skipped (resumable).
 *
 * Usage:
 *   node scripts/download_map_tiles.mjs            # zoom 0..6 (default)
 *   node scripts/download_map_tiles.mjs 0 7        # custom zoom range
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Config ─────────────────────────────────────────────────────────────────
const BASE_URL =
  process.env.MAP_TILES_BASE_URL ??
  'https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v2';

const MIN_ZOOM = Number(process.argv[2] ?? 0);
const MAX_ZOOM = Number(process.argv[3] ?? 6);
const CONCURRENCY = 24;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'map', 'v2');

// ─── Build the full job list (every tile in the square pyramid) ──────────────
function buildJobs() {
  const jobs = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const span = 2 ** z; // tiles per axis at this zoom
    for (let x = 0; x < span; x++) {
      for (let y = 0; y < span; y++) {
        jobs.push({ z, x, y });
      }
    }
  }
  return jobs;
}

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.size > 0;
  } catch {
    return false;
  }
}

async function downloadTile({ z, x, y }) {
  const dest = join(OUT_DIR, String(z), String(x), `${y}.webp`);
  if (await fileExists(dest)) return 'skip';

  const url = `${BASE_URL}/${z}/${x}/${y}.webp`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return 'missing'; // tile genuinely absent
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return 'ok';
}

// ─── Simple concurrency pool ─────────────────────────────────────────────────
async function run() {
  const jobs = buildJobs();
  const total = jobs.length;
  const counts = { ok: 0, skip: 0, missing: 0, error: 0 };
  let next = 0;
  let bytes = 0;
  const start = Date.now();

  console.log(
    `Downloading tiles z${MIN_ZOOM}..z${MAX_ZOOM} (${total} tiles) from ${BASE_URL}`
  );

  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        const result = await downloadTile(job);
        counts[result === 'ok' ? 'ok' : result === 'skip' ? 'skip' : 'missing']++;
      } catch (err) {
        counts.error++;
        if (counts.error <= 10) console.warn(`  ! ${err.message}`);
      }
      const done = counts.ok + counts.skip + counts.missing + counts.error;
      if (done % 250 === 0 || done === total) {
        const pct = ((done / total) * 100).toFixed(1);
        console.log(
          `  ${done}/${total} (${pct}%)  ok=${counts.ok} skip=${counts.skip} missing=${counts.missing} err=${counts.error}`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\nDone in ${secs}s — ok=${counts.ok} skip=${counts.skip} missing=${counts.missing} err=${counts.error}`
  );
  if (counts.error > 0) {
    console.log('Some tiles failed; re-run the script to retry (it resumes).');
    process.exitCode = 1;
  }
}

run();
