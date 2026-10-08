# Scripture Library design

## Current brief: frontend polish only
Match the restrained color scheme and formatting of the user's Hermes Desktop. Preserve the existing Scripture and quotation fonts, all content, routes, search, source data, and stored preferences. Do not change Hermes itself.

## Reference and direction
Inspected the actual Hermes window and read its shipped mono palette in `apps/shared/src/theme-presets.ts`. The visible desktop has a near-black reading surface, charcoal sidebar, soft gray text, understated outlines, compact sans-serif controls, and quiet selection states. This is an adaptation for a reading library, not a clone of the chat interface.

## Palette
- Dark reading surface: #0e0e0e
- Dark sidebar: #1b1b1b, visually matched to the running window
- Raised controls: #141414
- Primary text: #eaeaea
- Secondary text: #a0a0a0 (slightly brighter than the preset for small library labels)
- Borders: #2a2a2a
- Neutral selection: #292929; selected verses use a small filled verse-number marker rather than a paragraph background
- Focus ring: #9a9a9a
- Light counterpart: white reading surface, #f5f5f5 sidebar, #202020 text, #626262 secondary text, #e3e3e3 borders

## Typography
System sans-serif for identity, headings, navigation, and UI. **Retain exactly** the Charter / Palatino / Georgia stack for Scripture, quotations, and verse excerpts in search results. Keep the Scripture size preference and 1.85 line height. No downloaded fonts.

## Layout
Compact 66px toolbar; 214px sticky desktop sidebar; open reading area with a modest commentary margin. Smaller UI headings and consistent spacing distinguish application controls from primary text. The reader controls use one open row with a single bottom divider; no enclosing toolbar card or nested print-button outline. Source/verse links remain legible. On mobile, navigation wraps and the toolbar is not sticky, leaving space for reading.

```
Library identity              Search                 Theme
Book navigation  |  Breadcrumb
                 |  Heading / reading controls
                 |  Original serif text   Related appendices
```

## Review against brief
Keep the existing reading and navigation model. Do not add a chat composer, fake app tabs, new functionality, remote dependencies, decorative animation, or a new content hierarchy. Near-black is deliberate here because it is the user's named reference, not a generic dark-theme default. Use modest outlines and radii, not card-heavy decoration.

## Initial version, retained as history
The original presentation used blue-gray light/dark palettes and larger serif interface headings. This polish replaces that visual frame only; the academic content and original primary-text typography remain unchanged.
