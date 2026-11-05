# Languages

* All customer and partner text lives in `lib/shared/i18n/` (`en.ts`, `hi.ts`, `partner-en.ts`, `partner-hi.ts`). Category names, questions and consent texts are stored per language in the database (`{ en, hi }`) and edited in Admin → Categories.
* The Hindi strings are a **draft** written for this build — have a native speaker review them before launch.
* Users pick a language (cookie `ss_locale`, also saved on their account so notifications arrive in that language).
* Formats: INR via `Intl.NumberFormat('en-IN'|'hi-IN')`, Indian mobile numbers normalised to +91, 6-digit PIN validation, dates and times in Asia/Kolkata. Time-zone handling is IANA-based (`lib/core/util.ts`) so other countries/zones work by setting the provider's timezone.
* Fonts: Lora + Mukta (Devanagari) bundled via next/font.

## Adding a language (e.g. Tamil)
1. Copy `en.ts` to `ta.ts`, translate every value (the TypeScript type forces you to keep every key), and get it reviewed.
2. Add it to `LOCALES` in `lib/shared/i18n/index.ts`, and a matching `partner-ta.ts` if partners need it.
3. Add the Noto font for the script in `app/layout.tsx`.
4. Add the language in Admin → Languages and set it to "live" only after review.
Planned: Bengali, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese, Urdu (Urdu needs `dir="rtl"` on `<html>`).
