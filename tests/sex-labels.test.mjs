import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  'src/pages/conta.astro',
  'src/components/ProfileSidebar.astro',
  'public/js/user/user.js',
];

test('uses masculine and feminine labels while preserving M/F codes', async () => {
  const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  const joined = sources.join('\n');

  assert.match(joined, /Masculino/);
  assert.match(joined, /Feminino/);
  assert.doesNotMatch(joined, /\bMacho\b/);
  assert.doesNotMatch(joined, /\bFêmea\b/);
  assert.match(sources[0], /value="M"/);
  assert.match(sources[0], /value="F"/);
});
