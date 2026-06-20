# bodyflow Brand Assets

All bodyflow brand assets, organized by type and size. Originals preserved in `original/` folder.

## Asset Inventory

### App Icons

| Original Filename | Normalized Filename | Size | Purpose | Location |
|---|---|---|---|---|
| `bodyflow-app-icon-64.png` | `favicon.png` | 64×64 | Web favicon, PWA taskbar icon | `/public/icons/` (served), `/assets/brand/bodyflow/` (reference) |
| `bodyflow-app-icon-120.png` | — | 120×120 | iOS web clip icon (not currently used) | `original/` only |
| `bodyflow-app-icon-180.png` | `apple-touch-icon.png` | 180×180 | iOS home screen icon (iPad, iPhone) | `/public/icons/` (served), `/assets/brand/bodyflow/` (reference) |
| `bodyflow-app-icon-512.png` | `icon-512.png` | 512×512 | Android app icon, PWA icon (medium) | `/public/icons/` (served), `/assets/brand/bodyflow/` (reference) |
| `bodyflow-app-icon-1024.png` | `icon-1024.png` / `icon.png` | 1024×1024 | App Store / Play Store icon, PWA icon (high) | `/public/icons/` (served), `/assets/brand/bodyflow/` (reference) |

### Theme Variants (1024×1024)

Theme-specific versions for future use (e.g., flow-based icons):

| Original Filename | Normalized Filename | Theme | Purpose |
|---|---|---|---|
| `bodyflow-app-icon-1024-amber.png` | `icon-1024-amber.png` | Golden (Nutrition flow) | Reserved for future flow-specific branding |
| `bodyflow-app-icon-1024-light.png` | `icon-1024-light.png` | Slate Light | Reserved for future flow-specific branding |
| `bodyflow-app-icon-1024-mono.png` | `icon-1024-mono.png` | Monochrome | Reserved for future flow-specific branding |
| `bodyflow-app-icon-1024-sand.png` | `icon-1024-sand.png` | Sand (default light) | Reserved for future flow-specific branding |
| `bodyflow-app-icon-180-light.png` | `icon-180-light.png` | Slate Light | Reserved for iOS light mode (not currently used) |

## Where Icons Are Used

### Web / PWA
- **favicon** (`favicon.png`) — Browser tab, bookmarks, address bar
- **manifest.json** — PWA installation (references all three sizes)
- **apple-touch-icon** (`apple-touch-icon.png`) — iOS home screen when added to home

### Next.js Metadata
- `app/layout.tsx` — `icons.icon` → `/icons/favicon.png`
- `app/layout.tsx` — `icons.apple` → `/icons/apple-touch-icon.png`
- `public/manifest.webmanifest` — Icons array for PWA

### App Stores (Future)
- 512×512 (`icon-512.png`) — Android adaptive icon background
- 1024×1024 (`icon-1024.png`) — App Store, Play Store, marketing

## How to Use

### For Web
Icons are served from `/public/icons/` and referenced in:
```
public/manifest.webmanifest      → PWA icons
app/layout.tsx                   → favicon, apple-touch-icon
```

### For App Stores (iOS/Android)
When building with Expo or EAS:
- Use `icon-1024.png` as the source icon
- Adaptive icons are auto-generated from the 1024×1024 version

### For Branding / Reference
All assets are also stored in `/assets/brand/bodyflow/` for designer reference and version control.

## Notes

- **No regeneration**: All assets are final. Do not re-export or resize them.
- **Single source of truth**: `/public/icons/` is the live serving location; `/assets/brand/bodyflow/` is the reference archive.
- **Originals preserved**: Source assets kept in `original/` folder for audit trail and potential future re-exports.
- **Lowercase naming**: All filenames use lowercase "bodyflow" and normalized naming scheme (`icon-512.png` not `Icon512px.png`).
- **PNG format**: All icons are PNG with transparency (RGBA) for maximum compatibility.

## Future

Theme variants (amber, light, mono, sand) are available for:
- Dynamic app icon switching based on user's selected flow
- Alternative branding approaches
- Dark mode variants

Use the corresponding `icon-*-{theme}.png` file if implementing theme-specific icons.
