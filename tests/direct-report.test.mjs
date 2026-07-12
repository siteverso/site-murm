import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('denúncia é enviada por direct para o usuário murmurinho', async () => {
  const repository = await read('src/lib/server/repositories/directs.ts');
  const endpoint = await read('src/pages/api/directs/report.ts');
  const client = await read('public/js/directs/directs.js');

  assert.match(repository, /LOWER\(username\) = 'murmurinho'/);
  assert.match(repository, /DENÚNCIA DE CONVERSA/);
  assert.match(repository, /INSERT INTO murm_direct/);
  assert.match(endpoint, /reportDirectConversation/);
  assert.match(client, /\/api\/directs\/report/);
  assert.match(client, /Denúncia enviada para @murmurinho/);
});
