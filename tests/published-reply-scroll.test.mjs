import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/js/feed/published-reply-controller.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('publicar resposta preserva a âncora por todo o período de atualizações tardias', () => {
  assert.match(source, /captureReplyViewportAnchor\(parentId\)/);
  assert.match(source, /restoreReplyViewportAnchor\(viewportAnchor\)/);
  assert.match(source, /keepReplyViewportAnchorStable\(anchor, maxDurationMs = 15000\)/);
  assert.match(source, /requestAnimationFrame\(correctPosition\)/);
  assert.match(source, /reachedSafetyLimit/);
  assert.doesNotMatch(source, /layoutIsQuiet/);
  assert.match(source, /\['wheel', 'touchstart', 'pointerdown', 'keydown'\]/);
  assert.doesNotMatch(source, /scrollIntoView/);
});

test('desativa scroll anchoring nativo enquanto a âncora controlada está ativa', () => {
  assert.match(source, /document\.documentElement\.classList\.add\('reply-viewport-locked'\)/);
  assert.match(source, /document\.documentElement\.classList\.remove\('reply-viewport-locked'\)/);
  assert.match(css, /html\.reply-viewport-locked[\s\S]*overflow-anchor:\s*none/);
});

test('mantém o caminho profundo hidratado para o polling não fechar a resposta depois', () => {
  assert.match(source, /getSpecificThreadState\(specificRootId\)/);
  assert.match(source, /state\.expandedIds\.add\(String\(post\.id\)\)/);
  assert.match(source, /feedSignature = getFeedSignature\(posts\)/);
});

test('estabilizador corrige também um segundo deslocamento tardio', () => {
  let now = 0;
  let nextFrame = null;
  let top = 240;
  let scrollY = 1000;
  const listeners = new Map();
  const classes = new Set();

  const context = {
    posts: [],
    document: {
      documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}},
      querySelector: () => ({getBoundingClientRect: () => ({top})}),
    },
    CSS: {escape: String},
    window: {
      get scrollY() { return scrollY; },
      scrollBy: ({top: delta}) => { scrollY += delta; top -= delta; },
      scrollTo: ({top: value}) => { scrollY = value; },
      addEventListener: (type, fn) => listeners.set(type, fn),
      removeEventListener: type => listeners.delete(type),
    },
    performance: {now: () => now},
    requestAnimationFrame: fn => { nextFrame = fn; return 1; },
    cancelAnimationFrame: () => { nextFrame = null; },
    setTimeout,
    Map, Set, String, Math, Array, Promise,
  };

  vm.createContext(context);
  vm.runInContext(`${source}\nthis.__keep = keepReplyViewportAnchorStable;`, context);
  context.__keep({parentId: '10', top: 240, scrollY: 1000}, 15000);

  top = 180;
  now = 100;
  nextFrame();
  assert.equal(top, 240);
  assert.equal(scrollY, 940);

  top = 120;
  now = 2500;
  nextFrame();
  assert.equal(top, 240);
  assert.equal(scrollY, 820);
  assert.ok(classes.has('reply-viewport-locked'));
});
