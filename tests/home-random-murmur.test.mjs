import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/pages/index.astro', 'utf8');
const css = fs.readFileSync('src/styles/pages/home.css', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const moduleSource = fs.readFileSync('public/js/feed/random-murmur.js', 'utf8');

test('home substitutes the fixed recent heading with an anonymous random murmur', () => {
  assert.doesNotMatch(page, /<h1>\{t\.feed\.recent\}<\/h1>/);
  assert.match(page, /data-random-murmur/);
  assert.match(page, /data-random-murmur-link/);
});

test('random murmur rotates every five seconds and opens the normal post route', () => {
  assert.match(moduleSource, /RANDOM_MURMUR_INTERVAL_MS = 5000/);
  assert.match(moduleSource, /\/perfil\/\$\{encodeURIComponent\(post\.author\)\}\?murmurio=/);
  assert.match(moduleSource, /post\.isPrivate/);
  assert.match(app, /\/js\/feed\/random-murmur\.js/);
});

test('list cards align to the same horizontal shell edge', () => {
  assert.match(css, /\.all-lane \.lane-feed-list\s*\{[^}]*padding-inline:\s*0/s);
});
