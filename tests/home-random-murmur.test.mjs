import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/components/FeedBoard.astro', 'utf8');
const css = fs.readFileSync('src/styles/pages/home.css', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const moduleSource = fs.readFileSync('public/js/feed/random-murmur.js', 'utf8');

test('home substitutes the fixed heading with username and murmur links', () => {
  assert.doesNotMatch(page, /<h1>\{t\.feed\.recent\}<\/h1>/);
  assert.match(page, /data-random-murmur-user/);
  assert.match(page, /data-random-murmur-link/);
  assert.match(page, /data-random-murmur-content/);
});

test('username opens profile and text opens the normal murmur route', () => {
  assert.match(moduleSource, /userLink\.href = `\/perfil\/\$\{encodeURIComponent\(author\)\}`/);
  assert.match(moduleSource, /const postUrl = `\/murmurio\/\$\{encodeURIComponent\(post\.id\)\}`/);
  assert.match(moduleSource, /userLink\.textContent = `@\$\{author\}`/);
  assert.match(moduleSource, /post\.isPrivate/);
});

test('random murmur defaults to four seconds, accepts the env-backed page value and reshuffles in a loop', () => {
  assert.match(page, /PUBLIC_HOME_RANDOM_MURMUR_INTERVAL_MS/);
  assert.match(page, /data-random-murmur-interval-ms=\{randomMurmurIntervalMs\}/);
  assert.match(moduleSource, /DEFAULT_RANDOM_MURMUR_INTERVAL_MS = 4000/);
  assert.match(moduleSource, /dataset\?\.randomMurmurIntervalMs/);
  assert.match(moduleSource, /randomMurmurIndex >= randomMurmurQueue\.length/);
  assert.match(moduleSource, /randomMurmurQueue = shuffleRandomMurmurs\(items\)/);
  assert.match(app, /\/js\/feed\/random-murmur\.js/);
});

test('username receives stronger visual emphasis', () => {
  assert.match(css, /\.random-murmur__user\s*\{[^}]*font-weight:\s*900/s);
});

test('list cards align to the same horizontal shell edge', () => {
  assert.match(css, /\.all-lane \.lane-feed-list\s*\{[^}]*padding-inline:\s*0/s);
});
