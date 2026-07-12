import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const repository = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/components/thread.css', import.meta.url), 'utf8');

test('thread específica carrega toda a cadeia de ancestrais', () => {
  assert.match(repository, /START WITH id = :post_id[\s\S]*CONNECT BY PRIOR parent_post_id = id/);
});

test('somente o pai direto fica completo e ancestrais distantes viram linhas compactas', () => {
  assert.match(app, /function getDistantAncestorChain\(post, loadedById\)/);
  assert.match(app, /function renderDistantAncestorLine\(post\)/);
  assert.match(app, /const fullParentCard = parentShell\.replace/);
  assert.match(app, /return `\$\{ancestorContext\}\$\{fullParentCard\}`/);
});

test('linha ancestral ocupa largura total e corta texto em uma linha', () => {
  assert.match(css, /\.thread-ancestor-line \{[\s\S]*width: 100%/);
  assert.match(css, /\.thread-ancestor-line__preview \{[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap/);
});
