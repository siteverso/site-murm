import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('remove região brasileira da conta, home e aplicação', () => {
  const account = read('src/pages/conta.astro');
  const home = read('src/pages/index.astro');
  const app = read('public/app.js');
  assert.doesNotMatch(account, /Região do Brasil|regionCode|columnGroupCode/);
  assert.doesNotMatch(home, /Regiões do Brasil|data-column-group-select/);
  assert.doesNotMatch(app, /regionCode|columnGroupCode|data-profile-region/);
});

test('conta oferece busca de país com ISO e DDI via endpoint público cacheado', () => {
  const account = read('src/pages/conta.astro');
  const countries = read('src/pages/api/countries.ts');
  const app = read('public/app.js');
  assert.match(account, /name="countryCode"/);
  assert.match(account, /name="countryCallingCode"/);
  assert.match(account, /Buscar país por nome, código ou DDI/);
  assert.match(countries, /restcountries\.com\/v3\.1\/all/);
  assert.match(countries, /CACHE_TTL_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(app, /function bindCountryPicker\(\)/);
  assert.match(app, /country\.callingCode/);
});

test('patch de país é incremental e remove colunas antigas', () => {
  const patch = read('murm-oracle/database/patches/20260712-0415-replace-brazil-region-with-country.sql');
  assert.match(patch, /ALTER TABLE murm_user ADD/);
  assert.match(patch, /country_code VARCHAR2\(2\)/);
  assert.match(patch, /DROP COLUMN region_code/);
  assert.doesNotMatch(patch, /CREATE TABLE/i);
});

test('nenhuma consulta ou tipo de runtime referencia REGION_CODE removido', () => {
  const runtimeFiles = [
    'src/lib/server/session.ts',
    'src/lib/server/user-schema.ts',
    'src/lib/server/repositories/users.ts',
    'src/lib/server/repositories/posts.ts',
    'src/pages/api/auth/profile.ts',
  ];

  for (const file of runtimeFiles) {
    const contents = read(file);
    assert.doesNotMatch(contents, /REGION_CODE|region_code|regionCode|data-profile-region/,
      `${file} ainda referencia região brasileira removida`);
  }
});
