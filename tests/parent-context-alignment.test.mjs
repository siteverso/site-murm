import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/styles/pages/profile-feed.css', import.meta.url), 'utf8');
const profilePage = fs.readFileSync(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8');
const murmurPage = fs.readFileSync(new URL('../src/pages/murmurio/[id].astro', import.meta.url), 'utf8');

test('mensagem pai ocupa a faixa superior e o seletor permanece à direita', () => {
  assert.match(murmurPage, /parent-thread-page/);
  assert.match(css, /\.parent-thread-page\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(css, /\.parent-thread-page\s*>\s*\.parent-message-panel\s*\{[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*1/);
  assert.match(css, /network-board-heading\s*\{[\s\S]*grid-column:\s*2;[\s\S]*grid-row:\s*1/);
  assert.match(css, /network-board\s*\{[\s\S]*grid-column:\s*1 \/ -1;[\s\S]*grid-row:\s*2/);
});

test('perfil público usa o mesmo layout contextual do pai', () => {
  assert.match(profilePage, /'parent-feed-page':\s*!showRepliesPage/);
});
