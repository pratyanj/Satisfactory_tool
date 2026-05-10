# Icon Quick Reference

## Icon Inventory

| Icon Name | File | Size | Color | Purpose |
|-----------|------|------|-------|---------|
| Factory | `factory-icon.png` | 217B | Orange | Main branding |
| Features | `features-icon.png` | 152B | Gold | Feature highlights |
| Chart | `chart-icon.png` | 157B | Blue | Data visualization |
| Wrench | `wrench-icon.png` | 284B | Gray | Configuration/tools |
| Tree | `tree-icon.png` | 176B | Green | Hierarchical data |
| Box | `box-icon.png` | 555B | Brown | Items/packages |
| Building | `factory-building-icon.png` | 270B | Slate | Structures |
| Rocket | `rocket-icon.png` | 586B | Red-Orange | Launch/features |
| Tools | `tools-icon.png` | 425B | Dark Gray | Tech stack |
| Folder | `folder-icon.png` | 232B | Orange | File structure |
| Gamepad | `gamepad-icon.png` | 447B | Purple | Gaming content |
| Lightning | `lightning-icon.png` | 140B | Yellow | Quick start |
| Book | `book-icon.png` | 444B | Steel Blue | Documentation |
| Handshake | `handshake-icon.png` | 393B | Lime | Collaboration |
| Document | `document-icon.png` | 219B | Gray | Legal/license |

## Usage Template

### For H1 (Main Title)
```html
# <img src="public/icons/[icon-name].png" alt="[Alt]" width="24" height="24" align="center"> Title
```

### For H2 (Section Headers)
```html
## <img src="public/icons/[icon-name].png" alt="[Alt]" width="20" height="20" align="center"> Section
```

### For H3 (Subsection Headers)
```html
### <img src="public/icons/[icon-name].png" alt="[Alt]" width="18" height="18" align="center"> Subsection
```

## Adding New Icons

1. Download icon from [Iconify](https://iconify.design/)
2. Save to `public/icons/[name].png`
3. Use template above with appropriate size
4. Update this reference document

## Icon Design Guidelines

- **Format**: PNG (SVG source from Iconify)
- **Base Size**: 32x32 pixels
- **Display Sizes**: 
  - H1: 24x24px
  - H2: 20x20px
  - H3: 18x18px
- **Style**: Material Design Icons (MDI)
- **Colors**: Thematic (match content purpose)
- **Alignment**: `align="center"` for inline display

## Maintenance

To re-download all icons:
```bash
python scripts/download_readme_icons.py
```

To add a new icon to the script:
1. Edit `scripts/download_readme_icons.py`
2. Add entry to `ICON_MAPPINGS` dictionary
3. Run the script

## Benefits Over Emojis

✅ Consistent rendering across platforms  
✅ Professional appearance  
✅ Customizable colors and sizes  
✅ Better accessibility (alt text)  
✅ Version control friendly  
✅ No Unicode/encoding issues  
✅ Scalable and replaceable
