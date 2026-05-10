import requests
import os

# Icon mappings: emoji -> (filename, icon_url)
# Using simple, professional icons from various free sources
ICON_MAPPINGS = {
    '🏗️': ('factory-icon.png', 'https://api.iconify.design/mdi:factory.svg?color=%23ff6b35&width=32&height=32'),
    '✨': ('features-icon.png', 'https://api.iconify.design/mdi:star-four-points.svg?color=%23ffd700&width=32&height=32'),
    '📊': ('chart-icon.png', 'https://api.iconify.design/mdi:chart-bar.svg?color=%234a90e2&width=32&height=32'),
    '🔧': ('wrench-icon.png', 'https://api.iconify.design/mdi:wrench.svg?color=%23808080&width=32&height=32'),
    '🌳': ('tree-icon.png', 'https://api.iconify.design/mdi:file-tree.svg?color=%2350c878&width=32&height=32'),
    '📦': ('box-icon.png', 'https://api.iconify.design/mdi:package-variant.svg?color=%23cd853f&width=32&height=32'),
    '🏭': ('factory-building-icon.png', 'https://api.iconify.design/mdi:office-building.svg?color=%23708090&width=32&height=32'),
    '🚀': ('rocket-icon.png', 'https://api.iconify.design/mdi:rocket-launch.svg?color=%23ff4500&width=32&height=32'),
    '🛠️': ('tools-icon.png', 'https://api.iconify.design/mdi:tools.svg?color=%23696969&width=32&height=32'),
    '📁': ('folder-icon.png', 'https://api.iconify.design/mdi:folder-open.svg?color=%23ffa500&width=32&height=32'),
    '🎮': ('gamepad-icon.png', 'https://api.iconify.design/mdi:gamepad-variant.svg?color=%239370db&width=32&height=32'),
    '⚡': ('lightning-icon.png', 'https://api.iconify.design/mdi:lightning-bolt.svg?color=%23ffeb3b&width=32&height=32'),
    '📖': ('book-icon.png', 'https://api.iconify.design/mdi:book-open-page-variant.svg?color=%234682b4&width=32&height=32'),
    '🤝': ('handshake-icon.png', 'https://api.iconify.design/mdi:handshake.svg?color=%2332cd32&width=32&height=32'),
    '📄': ('document-icon.png', 'https://api.iconify.design/mdi:file-document.svg?color=%23a9a9a9&width=32&height=32'),
}

def download_icons(output_dir):
    """Download all icons to the specified directory."""
    os.makedirs(output_dir, exist_ok=True)
    
    for emoji, (filename, url) in ICON_MAPPINGS.items():
        output_path = os.path.join(output_dir, filename)
        
        try:
            print(f"Downloading {filename}...")
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            print(f"  [OK] Saved to {output_path}")
        except Exception as e:
            print(f"  [FAIL] Failed to download {filename}: {e}")

if __name__ == '__main__':
    icons_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    download_icons(icons_dir)
    print("\n[SUCCESS] All icons downloaded successfully!")
