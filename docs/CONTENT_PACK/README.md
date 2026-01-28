# MVP Content Pack (fill-in templates)

This folder is the **non-code input** needed to build the restaurant site without guessing.

## What you should fill in (MVP)

- `restaurant.json`: identity + contact + location + socials + staff inbox
- `hours.yml`: opening hours / service periods (multiple per day supported)
- `menu.json`: categories, items, variants, prices, tags
- `gallery.csv`: image filenames + **required alt text** + sort order
- `testimonials.csv`: testimonials + sort order + publish flag
- `pages/`: copy for home/about/contact, etc.
- `reservation_copy.md`: policy text shown to guests (and included in emails)

## Image files

Put image binaries in a sibling folder you control (e.g. `assets/images/`), then reference filenames from `gallery.csv` and `restaurant.json`.

## Conventions

- All times are local to the restaurant timezone (see `restaurant.json`).
- Sort orders are integers; lower means earlier.
- Alt text is **required** for all gallery images (accessibility + SEO).

## Definition of “ready for implementation”

All templates are filled in with real values (no `TODO` markers) and any referenced image filenames exist.

