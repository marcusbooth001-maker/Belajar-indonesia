import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { filterVocab } from '../src/lib/search.js';
import { filterDeck, promptEnglish, summarise } from '../src/lib/deck.js';

const vocab = JSON.parse(readFileSync(new URL('../src/data/vocab.json', import.meta.url)));
const course = JSON.parse(readFileSync(new URL('../src/data/course.json', import.meta.url)));

const expected = { 1: 206, 2: 210, 3: 215, 4: 220, 5: 231, 6: 240, 7: 245, 8: 250 };

assert.equal(vocab.length, 1817, 'vocabulary total');
assert.equal(course.vocabTotal, 1817);
assert.equal(vocab.length, course.termMeta.reduce((sum, term) => sum + term.count, 0));

const byTerm = {};
for (const item of vocab) {
  assert.ok(item.id && item.indonesian && item.english && item.theme, item.id);
  assert.equal(typeof item.colloquial, 'boolean');
  assert.equal(typeof item.slang, 'boolean');
  assert.ok(item.root === null || typeof item.root === 'string');
  assert.ok(item.standard === null || typeof item.standard === 'string');
  byTerm[item.term] = (byTerm[item.term] || 0) + 1;
}
assert.deepEqual(byTerm, expected);

for (const term of course.termMeta) {
  assert.equal(byTerm[term.n], term.count, `term meta ${term.n}`);
}

assert.equal(new Set(vocab.map((item) => item.id)).size, 1817);
assert.equal(new Set(vocab.map((item) => item.indonesian)).size, 1817);

const gue = vocab.find((item) => item.indonesian === 'gue / gua');
assert.equal(gue.colloquial, true);
assert.equal(gue.standard, 'saya/aku');
assert.equal(gue.root, null);

const menonton = vocab.find((item) => item.indonesian === 'menonton');
assert.equal(menonton.root, 'tonton');
assert.equal(menonton.colloquial, true);
assert.equal(menonton.colloquialVariant, 'nonton');

const dong = vocab.find((item) => item.indonesian === 'dong');
assert.equal(dong.colloquial, true);
assert.equal(dong.standard, null);

const baper = vocab.find((item) => item.indonesian.startsWith('baper'));
assert.equal(baper.slang, true);
assert.equal(baper.colloquial, false);

assert.equal(
  filterVocab(vocab, { query: 'family', term: '1' }).some((item) => item.indonesian === 'keluarga'),
  true,
);
assert.equal(filterVocab(vocab, { term: '1', theme: 'Greetings and classroom language' }).length, 20);
assert.equal(filterVocab(vocab, { register: 'colloquial' }).length, vocab.filter((item) => item.colloquial).length);
assert.equal(filterVocab(vocab, { query: 'zzzz-not-a-word' }).length, 0);
assert.equal(filterVocab(vocab, { query: 'Saya/Aku' }).some((item) => item.id === gue.id), true);

assert.equal(promptEnglish('to watch (← tonton); nonton [coll.]'), 'to watch; nonton [coll.]');
assert.equal(promptEnglish('no, not [coll.] → tidak'), 'no, not [coll.]');

const termTwo = filterDeck(vocab, { term: 2 });
assert.equal(termTwo.length, 210);
const progress = { [termTwo[0].id]: 'known', [termTwo[1].id]: 'unknown' };
assert.deepEqual(summarise(termTwo, progress), { known: 1, unknown: 1, unseen: 208, total: 210 });
assert.equal(filterDeck(termTwo, { pool: 'known', progress }).length, 1);
assert.equal(filterDeck(termTwo, { pool: 'remaining', progress }).length, 209);

console.log(`Vocabulary checks passed (${vocab.length} items).`);
