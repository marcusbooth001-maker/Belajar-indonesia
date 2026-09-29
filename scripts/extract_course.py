#!/usr/bin/env python3
"""Extract the two-year Indonesian course plan into JSON for the static site.

Reads source/Two-Year-Indonesian-Plan.docx and writes:
  src/data/course.json   — prose, tables and lists, grouped into pages
  src/data/vocab.json    — every vocabulary item (one object per listed entry)

Nothing in the vocabulary tables is dropped or invented. Root, colloquial
markings and standard forms are parsed out of the original gloss and the
full gloss is kept as well.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "source" / "Two-Year-Indonesian-Plan.docx"
DATA = ROOT / "src" / "data"

TERM_RE = re.compile(r"^Term (\d+) vocabulary:")
TERM_HEAD_RE = re.compile(r"^Term (\d+):")
THEME_RE = re.compile(r"^(.+?)\s*\((\d+)\)\s*$")
ROOT_RE = re.compile(r"\(←\s*([^)]+)\)")
STANDARD_RE = re.compile(r"→\s*(.+)$")


def para_runs(paragraph: Paragraph) -> list[dict]:
    merged: list[dict] = []
    for run in paragraph.runs:
        if run.text == "":
            continue
        strong = bool(run.bold)
        if merged and merged[-1]["strong"] is strong:
            merged[-1]["text"] += run.text
        else:
            merged.append({"text": run.text, "strong": strong})
    if not merged and paragraph.text:
        merged = [{"text": paragraph.text, "strong": False}]
    joined = "".join(part["text"] for part in merged)
    # Fall back to the paragraph string if run reconstruction drifts.
    if joined.strip() != paragraph.text.strip():
        return [{"text": paragraph.text, "strong": False}]
    return merged


def cell_paragraphs(cell) -> list[list[dict]]:
    paras = []
    for paragraph in cell.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        paras.append(para_runs(paragraph))
    return paras


def row_cells(row) -> list[list[list[dict]]]:
    seen = set()
    cells = []
    for cell in row.cells:
        cid = id(cell._tc)
        if cid in seen:
            continue
        seen.add(cid)
        cells.append(cell_paragraphs(cell))
    return cells


def runs_text(runs: list[dict]) -> str:
    return "".join(part["text"] for part in runs).strip()


def flatten_cell(paras: list[list[dict]]) -> str:
    return " ".join(runs_text(p) for p in paras).strip()


def iter_blocks(doc: Document):
    for child in doc.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield "p", Paragraph(child, doc)
        elif child.tag == qn("w:tbl"):
            yield "t", Table(child, doc)


def parse_vocab_item(indonesian: str, english: str, term: int, theme: str, index: int) -> dict:
    root_match = ROOT_RE.search(english)
    standard_match = STANDARD_RE.search(english)
    # "; nonton [coll.]" marks a colloquial variant of a standard headword.
    # Other [coll.] tags mark the headword itself.
    variant_match = re.search(r";\s*([^;]+?)\s*\[coll[^\]]*\]\s*$", english)
    tags = re.findall(r"\[([^\]]+)\]", f"{indonesian} {english}")
    return {
        "id": f"t{term}-{index:03d}",
        "term": term,
        "theme": theme,
        "indonesian": indonesian,
        "english": english,
        "root": root_match.group(1).strip() if root_match else None,
        "colloquial": any("coll." in tag for tag in tags),
        "colloquialVariant": variant_match.group(1).strip() if variant_match else None,
        "slang": any("slang" in tag for tag in tags),
        "standard": standard_match.group(1).strip() if standard_match else None,
    }


def table_has_header(table: Table) -> bool:
    tr_pr = table.rows[0]._tr.find(qn("w:trPr"))
    return tr_pr is not None and tr_pr.find(qn("w:tblHeader")) is not None


def serialise_row(row) -> list:
    return [
        [[{"text": part["text"], "strong": part["strong"]} for part in para] for para in cell]
        for cell in row
    ]


def table_block(table: Table) -> dict:
    rows = [row_cells(row) for row in table.rows]
    if not rows:
        raise SystemExit("Empty table")
    if table_has_header(table):
        headers = [flatten_cell(cell) for cell in rows[0]]
        body = [serialise_row(row) for row in rows[1:]]
    else:
        headers = None
        body = [serialise_row(row) for row in rows]
    return {"type": "table", "headers": headers, "rows": body}


def main() -> None:
    doc = Document(DOCX)
    home: list[dict] = []
    terms: dict[int, dict] = {}
    assessment: list[dict] = []
    resources: list[dict] = []
    appendices: list[dict] = []
    vocab_intro: list[dict] = []
    vocab: list[dict] = []

    mode = "home"
    current_term: int | None = None
    current_year = "Year 1"
    in_vocab_tables = False
    vocab_term: int | None = None
    vocab_theme: str | None = None
    vocab_index = 0
    theme_expected: dict[tuple[int, str], int] = {}
    bullet_buf: list[list[dict]] = []
    bullet_target: list[dict] | None = None

    def target_list() -> list[dict]:
        if mode == "home":
            return home
        if mode == "term":
            return terms[current_term]["blocks"]
        if mode == "vocab-intro":
            return vocab_intro
        if mode == "assessment":
            return assessment
        if mode == "resources":
            return resources
        if mode == "appendices":
            return appendices
        raise SystemExit(f"No target for mode {mode}")

    def flush_bullets() -> None:
        nonlocal bullet_buf, bullet_target
        if bullet_buf:
            if bullet_target is None:
                raise SystemExit("Bullet buffer without a target")
            bullet_target.append({"type": "ul", "items": bullet_buf})
        bullet_buf = []
        bullet_target = None

    def add_block(block: dict) -> None:
        flush_bullets()
        target_list().append(block)

    for kind, block in iter_blocks(doc):
        if kind == "p":
            style = block.style.name if block.style else "Normal"
            text = block.text.strip()
            if not text and style == "Normal":
                continue

            if style == "Heading 1" and text.startswith("2. Term-by-term"):
                flush_bullets()
                mode = "home"
                add_block({"type": "h2", "text": text})
                continue
            if style == "Heading 1" and text in ("Year 1", "Year 2"):
                flush_bullets()
                current_year = text
                mode = "home"
                continue
            if style == "Heading 2" and TERM_HEAD_RE.match(text) and "vocabulary" not in text.lower():
                flush_bullets()
                n = int(TERM_HEAD_RE.match(text).group(1))
                current_term = n
                mode = "term"
                terms[n] = {"n": n, "year": current_year, "title": text, "blocks": []}
                continue
            if style == "Heading 1" and text.startswith("3. Vocabulary"):
                flush_bullets()
                mode = "vocab-intro"
                add_block({"type": "h2", "text": text})
                continue
            if style == "Heading 2" and TERM_RE.match(text):
                flush_bullets()
                in_vocab_tables = True
                vocab_term = int(TERM_RE.match(text).group(1))
                vocab_index = 0
                mode = "skip-vocab"
                continue
            if style == "Heading 3" and in_vocab_tables:
                match = THEME_RE.match(text)
                if not match:
                    raise SystemExit(f"Theme heading without a count: {text}")
                vocab_theme = match.group(1)
                theme_expected[(vocab_term, vocab_theme)] = int(match.group(2))
                continue
            if style == "Heading 1" and text.startswith("4. Assessment"):
                flush_bullets()
                in_vocab_tables = False
                mode = "assessment"
                add_block({"type": "h2", "text": text})
                continue
            if style == "Heading 1" and text.startswith("5. Suggested"):
                flush_bullets()
                mode = "resources"
                add_block({"type": "h2", "text": text})
                continue
            if style == "Heading 1" and text.startswith("Appendix"):
                flush_bullets()
                mode = "appendices"
                add_block({"type": "h2", "text": text})
                continue

            if mode == "skip-vocab":
                continue

            if style == "List Bullet":
                if bullet_target is None:
                    bullet_target = target_list()
                elif bullet_target is not target_list():
                    flush_bullets()
                    bullet_target = target_list()
                bullet_buf.append(para_runs(block))
                continue

            heading_type = {"Heading 1": "h2", "Heading 2": "h3", "Heading 3": "h4"}.get(style)
            if heading_type:
                add_block({"type": heading_type, "text": text})
                continue
            if style == "Normal":
                add_block({"type": "p", "runs": para_runs(block)})
                continue
            raise SystemExit(f"Unhandled style {style}: {text[:80]}")

        else:
            if in_vocab_tables:
                flush_bullets()
                header = [flatten_cell(c) for c in row_cells(block.rows[0])]
                if header != ["Indonesian", "English", "Indonesian", "English"]:
                    raise SystemExit(f"Unexpected vocab header in term {vocab_term}: {header}")
                for row in block.rows[1:]:
                    cells = [flatten_cell(c) for c in row_cells(row)]
                    if len(cells) != 4:
                        raise SystemExit(f"Vocab row width {len(cells)} in {vocab_theme}")
                    for indonesian, english in ((cells[0], cells[1]), (cells[2], cells[3])):
                        if not indonesian and not english:
                            continue
                        if not indonesian or not english:
                            raise SystemExit(f"Incomplete vocab pair: {indonesian!r} / {english!r}")
                        vocab_index += 1
                        vocab.append(
                            parse_vocab_item(indonesian, english, vocab_term, vocab_theme, vocab_index)
                        )
                continue
            add_block(table_block(block))

    flush_bullets()

    expected_totals = {1: 206, 2: 210, 3: 215, 4: 220, 5: 231, 6: 240, 7: 245, 8: 250}
    from collections import Counter

    got = Counter(item["term"] for item in vocab)
    if dict(got) != expected_totals:
        raise SystemExit(f"Term totals mismatch: {dict(got)}")
    if len(vocab) != 1817:
        raise SystemExit(f"Expected 1,817 items, got {len(vocab)}")
    themes = Counter((item["term"], item["theme"]) for item in vocab)
    for key, expected in theme_expected.items():
        if themes[key] != expected:
            raise SystemExit(f"Theme mismatch {key}: expected {expected}, got {themes[key]}")
    if len(terms) != 8:
        raise SystemExit(f"Expected 8 terms, got {list(terms)}")

    # Faithfulness: every non-empty paragraph and non-vocab cell string appears in the JSON.
    source_bits = collect_source_text(doc)
    json_bits = collect_json_text(
        home, [terms[n] for n in range(1, 9)], vocab_intro, assessment, resources, appendices, vocab
    )
    if source_bits != json_bits:
        for index, (src, out) in enumerate(zip(source_bits, json_bits)):
            if src != out:
                raise SystemExit(
                    "Text drift at item "
                    f"{index}:\nSRC: {src[:300]!r}\nOUT: {out[:300]!r}\n"
                    f"source items {len(source_bits)} json items {len(json_bits)}"
                )
        raise SystemExit(
            f"Text length mismatch: source {len(source_bits)} json {len(json_bits)}"
        )

    at_a_glance = next(
        block
        for block in home
        if block["type"] == "table" and (block["headers"] or [])[:1] == ["Term"]
    )
    term_meta = []
    for row in at_a_glance["rows"]:
        values = [flatten_runs(cell) for cell in row]
        n = int(values[0].lstrip("T"))
        term_meta.append(
            {
                "n": n,
                "year": values[1],
                "title": values[2],
                "cefr": values[3],
                "count": int(values[4]),
            }
        )

    course = {
        "title": "Two-Year Indonesian (Bahasa Indonesia) Course Plan",
        "titleId": "Rencana Pembelajaran Bahasa Indonesia Dua Tahun",
        "tagline": "Heritage learners at secondary level · CEFR A2 → B2 · 5 lessons per week over 2 years",
        "dated": "Course plan · September 2026 · British English",
        "vocabTotal": len(vocab),
        "termMeta": term_meta,
        "home": home,
        "terms": [terms[n] for n in range(1, 9)],
        "vocabIntro": vocab_intro,
        "assessment": assessment,
        "resources": resources,
        "appendices": appendices,
    }

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "course.json").write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n")
    (DATA / "vocab.json").write_text(json.dumps(vocab, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {len(vocab)} vocab items and course pages to {DATA}")


def flatten_runs(cell: list[list[dict]]) -> str:
    return " ".join("".join(part["text"] for part in para).strip() for para in cell).strip()


def collect_source_text(doc: Document) -> list[str]:
    bits = []
    in_vocab = False
    for kind, block in iter_blocks(doc):
        if kind == "p":
            text = block.text.strip()
            style = block.style.name if block.style else ""
            if style == "Heading 2" and TERM_RE.match(text):
                in_vocab = True
                continue
            if style == "Heading 3" and in_vocab:
                continue
            if style == "Heading 1" and text.startswith("4."):
                in_vocab = False
            if not text:
                continue
            if in_vocab:
                continue
            bits.append(text)
        elif in_vocab:
            for row in block.rows[1:]:
                cells = [flatten_cell(c) for c in row_cells(row)]
                for indonesian, english in ((cells[0], cells[1]), (cells[2], cells[3])):
                    if indonesian or english:
                        bits.append(f"{indonesian} || {english}")
        else:
            for row in block.rows:
                for cell in row_cells(row):
                    for para in cell:
                        text = runs_text(para)
                        if text:
                            bits.append(text)
    return bits


def collect_json_text(home, terms, vocab_intro, assessment, resources, appendices, vocab) -> list[str]:
    bits = []

    def walk(blocks: list[dict]) -> None:
        for block in blocks:
            if block["type"] in ("h2", "h3", "h4"):
                bits.append(block["text"])
            elif block["type"] == "p":
                bits.append(runs_text(block["runs"]))
            elif block["type"] == "ul":
                for item in block["items"]:
                    bits.append(runs_text(item))
            elif block["type"] == "table":
                for header in block["headers"] or []:
                    if header:
                        bits.append(header)
                for row in block["rows"]:
                    for cell in row:
                        for para in cell:
                            text = runs_text(para)
                            if text:
                                bits.append(text)

    walk(home)
    last_year = None
    for term in terms:
        if term["year"] != last_year:
            bits.append(term["year"])
            last_year = term["year"]
        bits.append(term["title"])
        walk(term["blocks"])
    walk(vocab_intro)
    for item in vocab:
        bits.append(f"{item['indonesian']} || {item['english']}")
    walk(assessment)
    walk(resources)
    walk(appendices)
    return bits


if __name__ == "__main__":
    main()
