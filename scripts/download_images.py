import os
import json
import urllib.request
from urllib.error import URLError, HTTPError
import ssl
import time

def download_images():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'data')
    output_dir = os.path.join(base_dir, 'public', 'images')

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")

    # Files to extract images from
    json_files = ['items.json', 'machines.json']
    
    downloads = []

    for file_name in json_files:
        file_path = os.path.join(data_dir, file_name)
        if not os.path.exists(file_path):
            print(f"Warning: Could not find {file_path}")
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # data is a dict of ID -> { id, name, imageUrl, ... }
            for key, obj in data.items():
                if 'imageUrl' in obj and obj['imageUrl']:
                    downloads.append((obj['id'], obj['imageUrl']))

    if not downloads:
        print("No images found to download in JSON files.")
        return

    print(f"Found {len(downloads)} images to download.")

    # Bypass SSL verification if there are certificate issues
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # Use a standard user agent to avoid being blocked
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    success_count = 0
    
    for item_id, url in downloads:
        ext = os.path.splitext(url)[1].split('?')[0]
        if not ext:
            ext = '.png'
            
        filename = f"{item_id}{ext}"
        filepath = os.path.join(output_dir, filename)
        
        # Skip if already downloaded
        if os.path.exists(filepath):
            print(f"Skipping {filename} (already exists)")
            success_count += 1
            continue
            
        print(f"Downloading {item_id} from {url} ...")
        
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        req = urllib.request.Request(url, headers=headers)
        
        try:
            with urllib.request.urlopen(req, context=ctx) as response:
                with open(filepath, 'wb') as f:
                    f.write(response.read())
            print(f"  -> Saved {filename}")
            success_count += 1
        except HTTPError as e:
            print(f"  -> Failed: HTTP {e.code} - {e.reason}")
        except URLError as e:
            print(f"  -> Failed: URL Error - {e.reason}")
        except Exception as e:
            print(f"  -> Error: {str(e)}")

    print(f"\nDownload complete! Successfully downloaded {success_count} out of {len(downloads)} images.")

if __name__ == '__main__':
    download_images()
