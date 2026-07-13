import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/teste-retorno-baralho.astro', 'utf8');

test('physics controls are placed in the left column', () => {
  assert.match(page, /grid-template-columns:\s*minmax\(340px, 410px\) minmax\(0, 1fr\)/);
  assert.match(page, /aside \{ grid-column: 1; grid-row: 1;/);
  assert.match(page, /\.workspace \{ grid-column: 2;/);
});

test('every slider receives a synchronized direct numeric input', () => {
  assert.match(page, /installDirectValueInputs/);
  assert.match(page, /number\.type = 'number'/);
  assert.match(page, /number\.dataset\.numberFor = range\.name/);
  assert.match(page, /range\.addEventListener\('input'/);
  assert.match(page, /number\.addEventListener\('input'/);
  assert.match(page, /number\.addEventListener\('change'/);
});
