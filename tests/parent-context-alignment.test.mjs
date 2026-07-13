import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/styles/pages/profile-feed.css', import.meta.url), 'utf8');
const profilePage = fs.readFileSync(new URL('../src/pages/perfil/[username].astro', import.meta.url), 'utf8');

test('painel pai alinha com o primeiro card e seletor fica no topo direito', () => {
  assert.match(css, /--context-feed-toolbar-height:\s*48px/);
  assert.match(css, /--context-feed-lane-heading-height:\s*56px/);
  assert.match(css, /\.parent-feed-page\s*>\s*\.parent-message-panel[\s\S]*margin-top:\s*calc\(/);
  assert.match(css, /\.feed-display-controls\s*\{[\s\S]*justify-content:\s*flex-end/);
});

test('perfil público usa o mesmo layout contextual do pai', () => {
  assert.match(profilePage, /'parent-feed-page':\s*!showRepliesPage/);
});
