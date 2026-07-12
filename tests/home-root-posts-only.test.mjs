import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('home mantém somente murmúrios de nível zero como cards principais', async () => {
    const source = await read('src/lib/server/repositories/posts.ts');
    const listPosts = source.slice(
        source.indexOf('export async function listPosts'),
        source.indexOf('type PostRow'),
    );

    assert.match(listPosts, /AND p\.parent_post_id IS NULL/i);
    assert.match(listPosts, /lower\(trim\(p\.post_type\)\) = 'murmur'/i);
    assert.match(listPosts, /return \[\.\.\.roots, \.\.\.previews\]/);
    assert.doesNotMatch(listPosts, /CONNECT BY/i);
    assert.doesNotMatch(listPosts, /START WITH/i);
});

test('contador e prévia de respostas preservam os filhos dentro do pai', async () => {
    const source = await read('src/lib/server/repositories/posts.ts');
    const listPosts = source.slice(
        source.indexOf('export async function listPosts'),
        source.indexOf('type PostRow'),
    );

    assert.match(listPosts, /SELECT count\(\*\)[\s\S]*reply\.parent_post_id = p\.id[\s\S]*AS reply_count/i);
    assert.match(listPosts, /replyCount: Number\(row\.REPLY_COUNT \|\| 0\)/);
    assert.match(listPosts, /PARTITION BY reply\.parent_post_id/);
    assert.match(listPosts, /WHERE preview_rank <= 2/);
});
