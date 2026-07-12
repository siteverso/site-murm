import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readAppSourceSync} from './js-source-test-utils.mjs';

const component = readFileSync(
    new URL('../src/components/ReplyHistorySection.astro', import.meta.url),
    'utf8',
);

const app = readAppSourceSync();

test('página de respostas reutiliza o renderizador completo dos cards normais', () => {
    assert.match(component, /data-reply-history/);
    assert.match(component, /data-reply-history-data/);
    assert.match(app, /function renderReplyHistory\(\)/);
    assert.match(app, /function renderReplyHistoryGroup\(group\)/);
    assert.match(app, /const threadPosts = Array\.isArray\(group\?\.posts\) \? group\.posts : \[\]/);
    assert.match(app, /renderPost\(root, childrenByParent/);
    assert.doesNotMatch(component, /murmur-actions is-static/);
});


test('renderização de respostas não chama slice diretamente em author possivelmente ausente', () => {
    assert.doesNotMatch(app, /post\.author\.slice\(/);
    assert.match(app, /userInitials\(post\.author\)/);
});
