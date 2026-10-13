# Belajar Indonesia

A static site for a two-year Bahasa Indonesia course aimed at English-speaking teenagers with one Indonesian-speaking parent. It publishes the full course plan: aims, methods, weekly rhythm, eight terms, all 1,817 listed vocabulary items, assessment, resources and appendices.

The site is built with [Astro](https://astro.build) and is published at <https://belajar.itsmyship.com/>.

## Pages

- Course: aims, assumptions, level targets, methods and the weekly rhythm. The sidebar Home button and the logo go to the portal hub at <https://itsmyship.com>, outside this site’s base path. The course start page in the menu is labelled Course.
- One page for each term, including that term’s vocabulary
- Vocabulary: instant search across Indonesian and English, with filters for term, theme and register
- Audio lessons: a player for each lesson, with the place in the recording saved in `localStorage`, plus a download for each term’s walking audio
- Flashcards: term and theme, flip, Indonesian-to-English or English-to-Indonesian, shuffle, and known or unknown marks saved in `localStorage`. Each card can play its word, with an auto-play toggle saved in `localStorage`. Listen mode plays Indonesian then English and moves through the current deck, including from the phone lock screen.
- Assessment, resources and appendices
- [Original course plan (PDF)](public/Two-Year-Indonesian-Plan.pdf)

## Local development

```bash
npm install
npm test
npm run dev
```

`npm test` checks that the vocabulary data still contains 1,817 items, with the term totals from the plan, and that search and flashcard filtering behave as expected.

`npm run build` writes the site to `dist/`. The site address and base path default to `https://belajar.itsmyship.com` and `/`. Set `SITE` or `BASE_PATH` to override them.

## Course data

`src/data/course.json` and `src/data/vocab.json` are extracted from `source/Two-Year-Indonesian-Plan.docx`. To regenerate them:

```bash
npm run extract
```

Do not edit the JSON by hand. Each vocabulary object keeps the original Indonesian headword and English gloss, plus `theme`, `root`, a colloquial flag, any colloquial variant, and the standard form where the plan gives one with `→`.

## Adding an audio lesson

Put the mp3 in `public/audio/` and add one object to `src/data/lessons.json` (`id`, `title`, `term`, `file`, `duration`, and the vocabulary groups). If the lesson has a script, save the markdown in `src/data/transcripts/` and set `transcript` to that file name. The audio page lists every entry.

Word clips live in `public/audio/words/`. Indonesian is `<vocab id>.mp3` and English is `<vocab id>-en.mp3`, for example `t1-001.mp3` and `t1-001-en.mp3`.

Walking audio is not in this repository. Each term links to `audio/walking/term-N-walking.mp3` (N is 1 to 8), built from `import.meta.env.BASE_URL`, on the flashcards page and the audio page.
