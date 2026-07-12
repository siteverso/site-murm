import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routePath = new URL('../src/pages/[username].astro', import.meta.url);

test('rota curta aceita @username e redireciona ao perfil publico', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /startsWith\('@'\)/);
  assert.match(source, /slice\(1\)/);
  assert.match(source, /Astro\.redirect\(`\/perfil\/\$\{encodeURIComponent\(username\)\}`\)/);
});

test('rota curta rejeita caminhos sem arroba', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /if \(!rawUsername\.startsWith\('@'\)/);
  assert.match(source, /Astro\.redirect\('\/'\)/);
});
