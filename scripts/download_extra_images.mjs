import { writeFile, stat, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'images');
const WIKI = 'https://satisfactory.wiki.gg/wiki/Special:FilePath/';

const TARGETS = {
  'medical_inhaler': 'Medical Inhaler.png',
  'parachute': 'Parachute.png',
  'gas_mask': 'Gas Mask.png',
  'hog_carapace': 'Hog Carapace.png',
  'spitter_organs': 'Spitter Organs.png',
  'sam_ore': 'SAM.png',
  'coffee_cup': 'Coffee Cup.png',
  'boombox': 'Boombox.png',
  'glass_foundation': 'Glass Foundation 8x4m.png',
  'asphalt_material': 'Asphalt Material.png',
  'wall_outlet': 'Wall Power Outlet Mk.1.png',
  'factory_sign': 'Factory Signs.png'
};

async function exists(p) {
  try { return (await stat(p)).size > 0; } catch { return false; }
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0, skip = 0, fail = 0;
  for (const [key, wikiName] of Object.entries(TARGETS)) {
    const dest = join(OUT_DIR, `${key}.png`);
    if (await exists(dest)) {
      console.log(`skip  ${key}.png (exists)`);
      skip++;
      continue;
    }
    
    // Try both wikiName and prefixed version for coffee_cup if needed
    const candidateNames = key === 'coffee_cup' ? ['FICSIT Coffee Cup.png', wikiName] : [wikiName];
    let success = false;
    
    for (const name of candidateNames) {
      const url = WIKI + encodeURIComponent(name).replace(/%20/g, '_');
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'image/png,*/*;q=0.5',
      };
      
      try {
        let buf = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await fetch(url, { redirect: 'follow', headers });
          if (res.status === 429) {
            const wait = 2000 * 2 ** attempt;
            console.log(`  429 on ${key}, waiting ${wait / 1000}s…`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          const ct = res.headers.get('content-type') || '';
          if (!res.ok || !ct.startsWith('image/')) {
            throw new Error(`HTTP ${res.status} ${ct}`);
          }
          buf = Buffer.from(await res.arrayBuffer());
          break;
        }
        
        if (buf && buf.length >= 500) {
          await writeFile(dest, buf);
          console.log(`ok    ${key}.png  (${(buf.length / 1024).toFixed(1)}KB) from ${name}`);
          ok++;
          success = true;
          break;
        }
      } catch (e) {
        // Continue to next candidate or fail
      }
    }
    
    if (!success) {
      console.warn(`FAIL  ${key}.png  <- ${wikiName}`);
      fail++;
    }
    
    await new Promise(r => setTimeout(r, 800));
  }
  console.log(`\nDone — ok=${ok} skip=${skip} fail=${fail}`);
  if (fail) process.exitCode = 1;
}

run();
