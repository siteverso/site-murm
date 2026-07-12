import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('resumo do perfil usa grid 2x2 com murmúrios, ecos, mensagens e respostas', async () => {
  const [component, css, users, session, pt] = await Promise.all([
    read('src/components/ProfileSidebar.astro'),
    read('src/styles/pages/account.css'),
    read('src/lib/server/repositories/users.ts'),
    read('src/lib/server/session.ts'),
    read('src/i18n/pt-BR.ts'),
  ]);

  assert.match(css, /\.profile-stats\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(component, /labels\.murmurs/);
  assert.match(component, /labels\.positives/);
  assert.match(component, /labels\.messages/);
  assert.match(component, /labels\.responses/);
  assert.doesNotMatch(component, /labels\.negatives|data-profile-negative/);
  assert.match(pt, /messages:\s*'mensagens'/);
  assert.match(pt, /responses:\s*'respostas'/);

  for (const source of [users, session]) {
    assert.match(source, /AS message_count/i);
    assert.match(source, /parent_post_id IS NOT NULL[\s\S]*AS response_count/i);
  }
});
