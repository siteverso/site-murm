import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readGlobalCss } from './css-test-utils.mjs';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/layouts/AppLayout.astro', import.meta.url), 'utf8');
const composer = await readFile(new URL('../src/components/Composer.astro', import.meta.url), 'utf8');
const config = await readFile(new URL('../src/lib/config/text.ts', import.meta.url), 'utf8');
const css = await readGlobalCss();
const envExample = await readFile(new URL('../deploy/.env.example', import.meta.url), 'utf8');
const postApi = await readFile(new URL('../src/pages/api/posts/index.ts', import.meta.url), 'utf8');
const replyApi = await readFile(new URL('../src/pages/api/posts/[id]/reply.ts', import.meta.url), 'utf8');
const directApi = await readFile(new URL('../src/pages/api/directs/index.ts', import.meta.url), 'utf8');

test('limite dos textos vem do ambiente com fallback seguro de 256', () => {
  assert.match(envExample, /PUBLIC_MURMUR_TEXT_LIMIT="256"/);
  assert.match(config, /import\.meta\.env\.PUBLIC_MURMUR_TEXT_LIMIT/);
  assert.match(config, /DEFAULT_TEXT_LIMIT = 256/);
  assert.match(layout, /window\.__MURMUR_TEXT_LIMIT__/);
  assert.match(app, /window\.__MURMUR_TEXT_LIMIT__/);
  assert.doesNotMatch(app, /maxlength="420"|Até 420 caracteres|maxlength="280"/);
  assert.match(composer, /maxlength=\{TEXT_LIMIT\}/);
  assert.match(postApi, /text\.length > TEXT_LIMIT/);
  assert.match(replyApi, /text\.length > TEXT_LIMIT/);
  assert.match(directApi, /contents\.length > TEXT_LIMIT/);
});

test('compositores exibem barra de uso atualizada em tempo real', () => {
  assert.match(app, /function progressMarkup\(\)/);
  assert.match(app, /data-murmur-progress/);
  assert.match(app, /data-progress-fill/);
  assert.match(app, /data-progress-value/);
  assert.match(app, /document\.addEventListener\('input'/);
  assert.match(app, /updateTextProgress\(field\)/);
});

test('contador usa interpolação RGB contínua até o limite', () => {
  assert.match(app, /function interpolateProgressColor\(ratio\)/);
  assert.match(app, /progress\.style\.setProperty\('--murmur-progress-r'/);
  assert.match(app, /progress\.style\.setProperty\('--murmur-progress-g'/);
  assert.match(app, /progress\.style\.setProperty\('--murmur-progress-b'/);
  assert.match(app, /progress\.classList\.toggle\('at-limit', ratio >= 1\)/);
  assert.match(css, /--murmur-progress-color: rgb\(var\(--murmur-progress-r\) var\(--murmur-progress-g\) var\(--murmur-progress-b\)\)/);
  assert.match(css, /linear-gradient\(90deg, rgb\(255 255 255 \/ \.92\) 0%, var\(--murmur-progress-color\) 100%\)/);
  assert.match(css, /\.murmur-progress\.at-limit \.murmur-progress-value \{ font-weight: 800; \}/);
});

