# Belajar Indonesia

A static site for a two-year Bahasa Indonesia course aimed at English-speaking teenagers with one Indonesian-speaking parent. It publishes the full course plan: aims, methods, weekly rhythm, eight terms, all 1,817 listed vocabulary items, assessment, resources and appendices.

The site is built with [Astro](https://astro.build) and is set up for GitHub Pages at <https://marcusbooth001-maker.github.io/Belajar-indonesia/>.

## Pages

- Home: course aims, assumptions, level targets, methods and the weekly rhythm
- One page for each term, including that term’s vocabulary
- Vocabulary: instant search across Indonesian and English, with filters for term, theme and register
- Audio lessons: a player for each lesson, with the place in the recording saved in `localStorage`
- Flashcards: term and theme, flip, Indonesian-to-English or English-to-Indonesian, shuffle, and known or unknown marks saved in `localStorage`
- Assessment, resources and appendices
- [Original course plan (PDF)](public/Two-Year-Indonesian-Plan.pdf)

## Local development

```bash
npm install
npm test
npm run dev
```

`npm test` checks that the vocabulary data still contains 1,817 items, with the term totals from the plan, and that search and flashcard filtering behave as expected.

`npm run build` writes the site to `dist/`.

## Course data

`src/data/course.json` and `src/data/vocab.json` are extracted from `source/Two-Year-Indonesian-Plan.docx`. To regenerate them:

```bash
npm run extract
```

Do not edit the JSON by hand. Each vocabulary object keeps the original Indonesian headword and English gloss, plus `theme`, `root`, a colloquial flag, any colloquial variant, and the standard form where the plan gives one with `→`.

## Adding an audio lesson

Put the mp3 in `public/audio/` and add one object to `src/data/lessons.json` (`id`, `title`, `term`, `file`, `duration`, and the vocabulary groups). If the lesson has a script, save the markdown in `src/data/transcripts/` and set `transcript` to that file name. The audio page lists every entry.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds the site and deploys it when changes are pushed to `main`.

Pages will not publish until it is switched on once in the repository settings:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

The workflow reads the Pages base path from `actions/configure-pages` (`base_path`), so asset and page links follow the repository name, including its capitalisation. For this repository that path is `/Belajar-indonesia/`, which is `https://marcusbooth001-maker.github.io/Belajar-indonesia/`. A local `npm run build` uses the same path unless `BASE_PATH` is set.
