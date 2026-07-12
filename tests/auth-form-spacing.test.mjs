import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('auth card description rule does not override form feedback spacing', async () => {
  const css = await read('src/styles/pages/auth.css');
  assert.match(css, /\.auth-card > h2 \+ p \{/);
  assert.doesNotMatch(css, /\.auth-card > p \{/);
  assert.match(css, /\.form-message \{[^}]*margin:\s*14px 0 0;/s);
});

test('recovery feedback follows the primary action before secondary navigation', async () => {
  const page = await read('src/pages/lembrar-senha.astro');
  const button = page.indexOf('type="submit"');
  const message = page.indexOf('data-form-message');
  const links = page.indexOf('class="auth-links"');
  assert.ok(button >= 0 && message > button && links > message);
});
