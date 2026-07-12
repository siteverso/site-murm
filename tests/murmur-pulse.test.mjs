import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function loadPulseComponent() {
  const window = {};
  vm.runInNewContext(read('public/js/posts/murmur-pulse.js'), { window });
  return window.MurmurPulse;
}

test('Pulso soma ecos e silenciamentos sem duplicar regra no card', () => {
  const pulse = loadPulseComponent();
  const renderer = read('public/js/posts/posts-and-replies.js');

  assert.equal(pulse.getValue({ positive: 4, negative: 3 }), 7);
  assert.equal(pulse.getValue({ positive: -2, negative: null }), 0);
  assert.match(renderer, /MurmurPulse\.render\(post\)/);
  assert.doesNotMatch(renderer, /post\.positive\s*[+-]\s*post\.negative/);
});

test('Pulso classifica intensidade e produz marcação acessível', () => {
  const pulse = loadPulseComponent();

  assert.equal(pulse.getLevel(0), 'silent');
  assert.equal(pulse.getLevel(1), 'low');
  assert.equal(pulse.getLevel(5), 'medium');
  assert.equal(pulse.getLevel(15), 'high');

  const html = pulse.render({ positive: 2, negative: 1 });
  assert.match(html, /murmur-pulse--low/);
  assert.match(html, /data-pulse-value="3"/);
  assert.match(html, /Pulso do murmúrio: 3 reações entre ecos e silenciamentos/);
});

test('carregador registra o componente antes do renderizador de posts', () => {
  const app = read('public/app.js');
  assert.ok(app.indexOf('/js/posts/murmur-pulse.js') < app.indexOf('/js/posts/posts-and-replies.js'));
});

test('estilo do Pulso é isolado por classes próprias', () => {
  const css = read('src/styles/components/murmur-card.css');
  assert.match(css, /\.murmur-pulse \{/);
  assert.match(css, /\.murmur-pulse__icon \{/);
  assert.match(css, /\.murmur-pulse--high \{/);
});
