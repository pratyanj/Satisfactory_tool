import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const images = {
  'miner_mk1.png': 'https://satisfactory.wiki.gg/images/0/07/Miner_Mk.1.png'
};

const dir = path.join(process.cwd(), 'public', 'images');
console.log('Dir is', dir);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, (response) => {
      console.log('Response status:', response.statusCode);
      if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest);
          response.pipe(file);
          file.on('finish', () => {
              file.close();
              resolve();
          });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
          download(response.headers.location as string, dest).then(resolve).catch(reject);
      } else {
        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err.message);
    });
  });
}

download(images['miner_mk1.png'], path.join(dir, 'miner_mk1.png')).then(() => console.log('Done')).catch(console.error);
