import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const postsRepository = await readFile(new URL('../src/lib/server/repositories/posts.ts', import.meta.url), 'utf8');
const usersRepository = await readFile(new URL('../src/lib/server/repositories/users.ts', import.meta.url), 'utf8');
const sessionRepository = await readFile(new URL('../src/lib/server/session.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../murm-oracle/database/patches/20260712-0435-rename-text-post-type-to-murmur.sql', import.meta.url), 'utf8');

test('novos textos e respostas do Murmurinho são gravados como murmur', () => {
    assert.match(postsRepository, /INSERT INTO murm_post[\s\S]*post_type[\s\S]*'murmur'/);
});

test('feed aceita murmúrios e apenas fotos com descrição, sem comentários de foto', () => {
    assert.match(postsRepository, /IN \('murmur', 'text'\)/);
    assert.match(postsRepository, /LOWER\(TRIM\(tree\.post_type\)\) = 'photo'[\s\S]*TRIM\(tree\.contents\) IS NOT NULL/);
    assert.doesNotMatch(postsRepository, /IN \('murmur', 'text', 'comment'\)/);
});

test('contadores incluem murmúrios e fotos descritas', () => {
    for (const source of [usersRepository, sessionRepository]) {
        assert.match(source, /IN \('murmur', 'text'\)/);
        assert.match(source, /LOWER\(TRIM\(p\.post_type\)\) = 'photo'[\s\S]*TRIM\(p\.contents\) IS NOT NULL/);
    }
});

test('patch incremental migra text para murmur e atualiza default e constraint', () => {
    assert.match(migration, /SET post_type = 'murmur'/);
    assert.match(migration, /post_type DEFAULT 'murmur'/);
    assert.match(migration, /CHECK \(post_type IN \('murmur', 'photo', 'comment'\)\)/);
});
