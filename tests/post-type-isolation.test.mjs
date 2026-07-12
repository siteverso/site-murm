import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Murmurinho lista somente registros do tipo murmur', async () => {
    const postsRepository = await read('src/lib/server/repositories/posts.ts');
    assert.match(postsRepository, /START WITH tree\.parent_post_id IS NULL[\s\S]*LOWER\(TRIM\(tree\.post_type\)\) = 'murmur'[\s\S]*CONNECT BY NOCYCLE PRIOR tree\.id = tree\.parent_post_id/);
    assert.doesNotMatch(postsRepository, /post_type[^\n]*<> 'photo'/i);
});

test('contadores da sessao e perfil contam somente murmurios', async () => {
    for (const path of ['src/lib/server/session.ts', 'src/lib/server/repositories/users.ts']) {
        const source = await read(path);
        assert.match(source, /LOWER\(TRIM\(p\.post_type\)\) = 'murmur'/);
        assert.doesNotMatch(source, /post_type[^\n]*<> 'photo'/i);
    }
});

test('novas publicacoes do Murmurinho gravam post_type murmur explicitamente', async () => {
    const postsRepository = await read('src/lib/server/repositories/posts.ts');
    assert.match(postsRepository, /INSERT INTO murm_post[\s\S]*post_type[\s\S]*'murmur'/);
});
