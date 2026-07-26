# Link — Design Language (macOS Sequoia–inspired, dark-matte-first)

## Philosophy
Calm, native-feeling, low-visual-noise. Dark mode is not "black with grey text" — it's a
deep matte grey system with subtle depth via layered surfaces and translucency, not
harsh contrast. Apple describes this as attractive and engaging while remaining calm and understated — well suited to focus-oriented use.

## Color System

### Dark Mode (primary mode — matte grey, NOT pure black)
| Layer | Hex (approx) | Use |
|---|---|---|
| Base background | `#1E1E20` | App window background |
| Elevated surface | `#252528` | Sidebar, panels |
| Card / message bubble (own) | `#2C2C30` | Sent message bubbles |
| Card / message bubble (other) | `#333338` | Received message bubbles |
| Border / separator | `#3A3A3E` | Hairline dividers |
| Primary text | `#F5F5F7` | Body text |
| Secondary text | `#A0A0A6` | Timestamps, metadata |
| Accent (brand) | `#0A84FF` | Links, active states, send button |
| Success / online | `#32D74B` | Presence indicator |
| Destructive | `#FF453A` | Delete, errors |

### Light Mode
| Layer | Hex (approx) | Use |
|---|---|---|
| Base background | `#F5F5F7` | App window background |
| Elevated surface | `#FFFFFF` | Sidebar, panels |
| Border / separator | `#E0E0E2` | Hairline dividers |
| Primary text | `#1D1D1F` | Body text |
| Secondary text | `#6E6E73` | Timestamps, metadata |
| Accent (brand) | `#007AFF` | Links, active states, send button |

**Rule**: never hard-code these as static values everywhere — define them as semantic
tokens (`bg.base`, `bg.elevated`, `text.primary`, etc.) so the whole UI switches modes
by swapping one token set. This mirrors Apple's own approach of using semantic colors that automatically adapt to the current appearance rather than hard-coded values. Maintain a minimum contrast ratio of 4.5:1 between foreground and background in both modes.

## Materials & Depth
- Use translucency/blur ("vibrancy") on the sidebar and title bar, not on message content — dark mode can increase vibrancy, a subtle blending effect between foreground and background, to help content stand out against darker backgrounds.
- Electron supports native macOS vibrancy directly via `BrowserWindow`'s `vibrancy` option (maps to system materials); on Windows, approximate it with a solid elevated-surface color plus a subtle 1px border, since native blur-behind isn't equivalent.
- Depth comes from layering flat, subtly-different surface shades (table above) — not drop shadows or gradients.

## Typography
- **macOS**: San Francisco (system default — no licensing to embed elsewhere, so don't bundle it for Windows)
- **Windows fallback**: Segoe UI Variable (native) or Inter (if you want visual consistency across platforms instead of native-per-OS fonts)
- Weight scale: Regular (body), Medium (labels/timestamps), Semibold (names, headers)
- Sizes: 13px body (chat messages), 11px metadata, 15–17px headers

## Spacing & Shape
- Base spacing unit: 4px (use multiples: 8, 12, 16, 24)
- Corner radius: 8px for message bubbles/cards, 6px for buttons/inputs, 12px for modals
- Sidebar width: fixed ~260px, collapsible

## Iconography
- Line icons, 1.5px stroke weight, no fill — consistent with SF Symbols' visual weight
- Use monochrome icons that inherit `text.secondary` color (adapts automatically to mode)

## Motion
- Fast, subtle transitions only: 150–200ms ease-out for hover/press states, 200–250ms for panel/modal open-close
- No bouncy/springy animation — matches the "calm, understated" tone, not a playful one
- Respect performance principle: animate `transform`/`opacity` only, never layout properties

## Window Chrome
- **macOS**: native traffic-light window controls (top-left), custom title bar content beside them
- **Windows**: standard title bar controls (top-right), styled to match the elevated-surface color rather than OS default white/grey

## Component Patterns
- **Sidebar**: peer list + group list, presence dot (green/grey) next to each name
- **Message bubbles**: rounded, own messages right-aligned in accent-tinted surface, others left-aligned in neutral surface
- **Status row**: small delivery indicator (✓ sent, ✓✓ delivered) inline with timestamp, `text.secondary` color
- **Call UI**: full-window overlay using the elevated-surface + vibrancy combo, not a separate stark black call screen