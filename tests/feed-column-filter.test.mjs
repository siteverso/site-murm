import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('modo colunas oferece somente sexo e faixa etária', async () => {
  const component = await read('../src/components/FeedBoard.astro');
  assert.match(component, /data-column-group-select/);
  assert.match(component, /value="sex">Sexo/);
  assert.match(component, /value="age">Faixa etária/);
  assert.doesNotMatch(component, /value="users">Usuários/);
  assert.doesNotMatch(component, />Colunas por<\/span>/);
  assert.doesNotMatch(component, /title="Colunas por"/);
  assert.match(component, /aria-label="Escolher como dividir as colunas"/);
});

test('filtro aparece apenas no modo colunas e rerenderiza o agrupamento', async () => {
  const controller = await read('../public/js/feed/feed-view-controller.js');
  const renderer = await read('../public/js/feed/feed-renderer.js');
  assert.match(controller, /columnGroupControl\.hidden = mode !== 'split'/);
  assert.match(controller, /renderSplitFeeds\(\)/);
  assert.match(renderer, /getSelectedColumnGroupMode\(\)/);
});

test('colunas de usuários são exclusivas para não repetir cards', async () => {
  const grouping = await read('../public/js/feed/core/feed-grouping.js');
  assert.match(grouping, /splitUsersIntoExclusiveGroups/);
  assert.match(grouping, /activeIds/);
});


test('faixa etária usa quatro colunas até 25, até 50, até 75 e 75+', async () => {
  const utils = await read('../public/app-utils.mjs');
  const grouping = await read('../public/js/feed/core/feed-grouping.js');
  const css = await read('../src/styles/pages/home.css');
  assert.match(utils, /code: 'to25'.*Até 25 anos/);
  assert.match(utils, /code: 'to50'.*26 a 50 anos/);
  assert.match(utils, /code: 'to75'.*51 a 75 anos/);
  assert.match(utils, /code: 'over75'.*75\+ anos/);
  assert.match(grouping, /definition\.code === 'to25'/);
  assert.match(grouping, /definition\.code === 'over75'/);
  assert.match(css, /data-column-count="4"/);
});

test('seletor de colunas mantém a mesma largura da barra e sem label visível', async () => {
  const css = await read('../src/styles/pages/home.css');
  assert.match(css, /feed-display-controls[\s\S]*width: 176px/);
  assert.match(css, /column-group-control select[\s\S]*width: 100%/);
  assert.match(css, /feed-view-switch \{ width: 100%/);
});


test('seta do select é customizada e alinhada no canto direito', async () => {
  const css = await read('../src/styles/pages/home.css');
  assert.match(css, /column-group-control::after[\s\S]*right: 14px/);
  assert.match(css, /column-group-control::after[\s\S]*top: 50%/);
  assert.match(css, /column-group-control select[\s\S]*appearance: none/);
  assert.match(css, /column-group-control select[\s\S]*padding: 0 38px 0 14px/);
});
