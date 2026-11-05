# Brand files and changing the brand

* Logo masters (editable SVG) and every derived PNG/ICO: `brand/assets/`. Regenerate all with `python3 brand/scripts/build_brand.py brand/assets` (needs Python with fontTools and `rsvg-convert`).
* Brand guide: `brand/guide/brand-guide.pdf` (and `.html`).
* Marketing templates (editable SVG + PNG previews): `brand/templates/`. Open in Figma, Illustrator, Inkscape or Canva (import SVG). Replace the `[bracketed]` placeholders with genuine details only.
* Central config: `lib/shared/brand.ts` (name, tagline, colours, contacts, social links, URLs) and `lib/shared/globals.css` (design tokens). Support email/phone can also be changed without a deploy in Admin → System settings.

## Change it once, copy to the other two projects
```bash
# run from the folder that contains all three unzipped projects
for d in Saj_Saathi_Partner_Owner_PWA Saj_Saathi_Admin_Console; do
  rm -rf $d/lib/core $d/lib/shared && cp -r Saj_Saathi_Customer_Website_PWA/lib/core Saj_Saathi_Customer_Website_PWA/lib/shared $d/lib/
  cp Saj_Saathi_Customer_Website_PWA/public/brand/* $d/public/brand/
done
```
