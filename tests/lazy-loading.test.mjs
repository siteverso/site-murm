import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readGlobalCss } from './css-test-utils.mjs';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readGlobalCss();
const layout = await readFile(new URL('../src/layouts/AppLayout.astro', import.meta.url), 'utf8');

test('feed usa skeleton shimmer apenas no carregamento inicial', () => {
  assert.match(app, /function renderFeedSkeletons\(\)/);
  assert.match(app, /if \(!hasRenderedFeed\) renderFeedSkeletons\(\)/);
  assert.match(css, /@keyframes murmur-skeleton-shimmer/);
});

test('cards e imagens usam lazy loading progressivo por viewport', () => {
  assert.match(app, /class="panel murmur-card lazy-reveal/);
  assert.match(app, /loading="lazy" decoding="async"/);
  assert.match(app, /new IntersectionObserver/);
  assert.match(css, /content-visibility: auto/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('cache do aplicativo foi atualizado para entregar o novo comportamento', () => {
  assert.match(layout, /app\.js\?v=20260712-reply-partial-refresh-1/);
});
