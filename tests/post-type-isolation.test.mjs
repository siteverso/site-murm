import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const postsRepository = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');
const usersRepository = await readFile(new URL('../src/lib/server/repositories/users.ts', import.meta.url), 'utf8');
const sessionRepository = await readFile(new URL('../src/lib/server/session.ts', import.meta.url), 'utf8');

test('a home do Murmurinho exclui fotos e toda a árvore de comentários delas', () => {
    assert.match(postsRepository, /START WITH tree\.parent_post_id IS NULL[\s\S]*NVL\(LOWER\(TRIM\(tree\.post_type\)\), 'text'\) <> 'photo'[\s\S]*CONNECT BY NOCYCLE PRIOR tree\.id = tree\.parent_post_id/);
});

test('contadores de perfil e sessão não contam publicações do FotoLife', () => {
    for (const source of [usersRepository, sessionRepository]) {
        assert.match(source, /NVL\(LOWER\(TRIM\(p\.post_type\)\), 'text'\) <> 'photo'/);
    }
});
