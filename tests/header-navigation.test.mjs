import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync('src/components/Header.astro', 'utf8');
const layoutCss = fs.readFileSync('src/styles/layout/app-shell.css', 'utf8');

test('cabeçalho usa a marca como retorno à home e remove o link Início', () => {
  assert.match(header, /class="brand" href="\/"/);
  assert.doesNotMatch(header, /class="nav-link" href="\/"/);
});

test('Bilhetes usa ícone de envelope acessível e mantém contador', () => {
  assert.match(header, /class="direct-nav-icon"/);
  assert.match(header, /aria-hidden="true"/);
  assert.match(header, /data-direct-badge/);
  assert.match(layoutCss, /\.direct-nav-icon/);
});
