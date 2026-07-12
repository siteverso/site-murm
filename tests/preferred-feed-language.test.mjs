import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('conta separa idioma preferencial do idioma de exibicao', () => {
  const account = read('src/pages/conta.astro');
  const app = read('public/app.js');
  assert.match(account, /name="preferredLanguageCode"/);
  assert.match(account, /Não altera o idioma da interface/);
  assert.match(app, /preferredLanguageCode: profileForm\.preferredLanguageCode\.value/);
});

test('feed prioriza idioma escolhido sem alterar ordem cronologica dentro dos grupos', () => {
  const posts = read('src/lib/server/repositories/posts.ts');
  assert.match(posts, /WHEN :profile_username IS NULL[\s\S]*:preferred_language_code[\s\S]*THEN 0/);
  assert.match(posts, /END,[\s\S]*p\.created_at DESC/);
});

test('novos murmurios registram idioma e patch permanece incremental', () => {
  const posts = read('src/lib/server/repositories/posts.ts');
  const patch = read('murm-oracle/database/patches/20260712-0615-add-preferred-feed-language.sql');
  assert.match(posts, /language_code[\s\S]*SELECT NVL\(language_code, 'pt-BR'\) FROM murm_user/);
  assert.match(patch, /PREFERRED_LANGUAGE_CODE/);
  assert.match(patch, /LANGUAGE_CODE/);
  assert.doesNotMatch(patch, /CREATE TABLE\s+murm_user/i);
});
