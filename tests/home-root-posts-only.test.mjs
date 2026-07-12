import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('home e listagem normal retornam somente murmúrios de nível zero', async () => {
    const source = await read('src/lib/server/repositories/posts.ts');
    const listPosts = source.slice(
        source.indexOf('export async function listPosts'),
        source.indexOf('type PostRow'),
    );

    assert.match(listPosts, /AND p\.parent_post_id IS NULL/);
    assert.match(listPosts, /LOWER\(TRIM\(p\.post_type\)\) = 'murmur'/);
    assert.doesNotMatch(listPosts, /CONNECT BY/i);
    assert.doesNotMatch(listPosts, /START WITH/i);
});

test('contador de respostas não injeta os filhos no feed', async () => {
    const source = await read('src/lib/server/repositories/posts.ts');
    const listPosts = source.slice(
        source.indexOf('export async function listPosts'),
        source.indexOf('type PostRow'),
    );

    assert.match(listPosts, /SELECT COUNT\(\*\)[\s\S]*reply\.parent_post_id = p\.id[\s\S]*AS reply_count/);
    assert.match(listPosts, /replyCount: Number\(row\.REPLY_COUNT \|\| 0\)/);
});
