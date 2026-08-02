# Streak foundation

This reference page is the contract for all v1 feature work. It intentionally uses no framework or build step, so Netlify can deploy it as a static site.

## Established UI system

- **Voice:** private practice, disciplined but non-punitive. Avoid dashboard clichés and gamified pressure.
- **Typeface:** Newsreader for reflective display copy; DM Sans for UI; DM Mono for dates, numbers, and labels.
- **Colour:** warm paper and deep botanical ink, with moss activity levels. Clay is reserved for the present-day marker and keyboard focus.
- **Grid:** desktop content width is 1240px; panels are squared with minimal radii; mobile collapses to one column.
- **Map states:** `0` is no completion, `1–4` are increasing completion levels. A future API must also distinguish `not scheduled` from `scheduled but missed`.

## Shared components

- `site-header`: wordmark, primary navigation, account trigger
- `eyebrow`: mono, uppercase context label
- `text-button`: underlined secondary action
- `habit-check`: semantic pressable completion control (`aria-pressed`)
- `heatmap` and `day`: 53-column, seven-row annual activity grid
- site footer: required ThisUncle Technologies credit

Feature agents may use these assets but must not alter `assets/css/tokens.css`, `assets/css/styles.css`, shared header/footer markup, or this file. Proposed shared changes must be returned to the Lead Agent.
