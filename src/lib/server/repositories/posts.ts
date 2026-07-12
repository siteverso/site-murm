import oracledb from 'oracledb';
import {withConnection} from '../oracle';

export async function listPosts(_currentUserId: number | null, profileUsername: string | null = null): Promise<unknown[]> {
    return withConnection(async connection => {
        // A leitura da home deve depender apenas das tabelas essenciais.
        // Avatar, região e voto não podem impedir que os murmúrios apareçam.
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT p.id,
                    p.user_id,
                    p.parent_post_id,
                    p.contents,
                    NVL(p.positive_count, 0) AS positive_count,
                    NVL(p.negative_count, 0) AS negative_count,
                    NVL(p.share_count, 0) AS share_count,
                    p.created_at,
                    u.username,
                    NVL(u.sex_code, '') AS sex_code,
                    '' AS region_code,
                    '' AS avatar_url,
                    0 AS my_vote,
                    parent_user.username AS parent_username
               FROM murm_post p
               JOIN murm_user u
                 ON u.id = p.user_id
               LEFT JOIN murm_post parent_post
                 ON parent_post.id = p.parent_post_id
               LEFT JOIN murm_user parent_user
                 ON parent_user.id = parent_post.user_id
              WHERE LOWER(TRIM(p.status)) = 'published'
                AND (
                    :profile_username IS NULL
                    OR LOWER(u.username) = LOWER(:profile_username)
                    OR LOWER(parent_user.username) = LOWER(:profile_username)
                )
              ORDER BY p.created_at DESC`,
            { profile_username: profileUsername },
        );

        const rows = result.rows || [];
        const replyCounts = new Map<number, number>();
        rows.forEach(row => {
            if (row.PARENT_POST_ID == null) return;
            const parentId = Number(row.PARENT_POST_ID);
            replyCounts.set(parentId, (replyCounts.get(parentId) || 0) + 1);
        });

        return rows.map(row => ({
            id: Number(row.ID),
            userId: Number(row.USER_ID),
            parentPostId: row.PARENT_POST_ID == null ? null : Number(row.PARENT_POST_ID),
            parentAuthor: String(row.PARENT_USERNAME || ''),
            author: String(row.USERNAME || ''),
            sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
            regionCode: '',
            avatarUrl: '',
            text: String(row.CONTENTS || ''),
            positive: Number(row.POSITIVE_COUNT || 0),
            negative: Number(row.NEGATIVE_COUNT || 0),
            shares: Number(row.SHARE_COUNT || 0),
            myVote: 0,
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
            replyCount: replyCounts.get(Number(row.ID)) || 0,
        }));
    });
}


type PostRow = Record<string, unknown>;

function mapPostRows(rows: PostRow[]): unknown[] {
    const replyCounts = new Map<number, number>();
    rows.forEach(row => {
        if (row.PARENT_POST_ID == null) return;
        const parentId = Number(row.PARENT_POST_ID);
        replyCounts.set(parentId, (replyCounts.get(parentId) || 0) + 1);
    });
    return rows.map(row => ({
        id: Number(row.ID),
        userId: Number(row.USER_ID || 0),
        parentPostId: row.PARENT_POST_ID == null ? null : Number(row.PARENT_POST_ID),
        parentAuthor: String(row.PARENT_USERNAME || ''),
        author: String(row.USERNAME || ''),
        sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
        regionCode: '',
        avatarUrl: '',
        text: String(row.CONTENTS || ''),
        positive: Number(row.POSITIVE_COUNT || 0),
        negative: Number(row.NEGATIVE_COUNT || 0),
        shares: Number(row.SHARE_COUNT || 0),
        myVote: 0,
        createdAt: new Date(String(row.CREATED_AT)).getTime(),
        replyCount: replyCounts.get(Number(row.ID)) || 0,
    }));
}

export async function listSpecificThread(postId: number): Promise<{ posts: unknown[]; siblingStubs: unknown[] }> {
    return withConnection(async connection => {
        const rootResult = await connection.execute<PostRow>(
            `SELECT parent_post_id FROM murm_post WHERE id = :post_id AND LOWER(TRIM(status)) = 'published'`,
            {post_id: postId},
        );
        const rootRow = rootResult.rows?.[0];
        if (!rootRow) throw new Error('POST_NAO_ENCONTRADO');
        const parentId = rootRow.PARENT_POST_ID == null ? null : Number(rootRow.PARENT_POST_ID);

        const fullResult = await connection.execute<PostRow>(
            `SELECT p.id,
                    p.user_id,
                    p.parent_post_id,
                    p.contents,
                    NVL(p.positive_count, 0) AS positive_count,
                    NVL(p.negative_count, 0) AS negative_count,
                    NVL(p.share_count, 0) AS share_count,
                    p.created_at,
                    u.username,
                    NVL(u.sex_code, '') AS sex_code,
                    parent_user.username AS parent_username
               FROM murm_post p
               JOIN murm_user u ON u.id = p.user_id
               LEFT JOIN murm_post parent_post ON parent_post.id = p.parent_post_id
               LEFT JOIN murm_user parent_user ON parent_user.id = parent_post.user_id
              WHERE LOWER(TRIM(p.status)) = 'published'
                AND (
                    p.id = :post_id
                    OR p.id = :parent_id
                    OR p.id IN (
                        SELECT id
                          FROM murm_post
                         WHERE LOWER(TRIM(status)) = 'published'
                         START WITH parent_post_id = :post_id
                         CONNECT BY PRIOR id = parent_post_id
                    )
                )
              ORDER BY p.created_at ASC`,
            {post_id: postId, parent_id: parentId},
        );

        let siblingStubs: unknown[] = [];
        if (parentId != null) {
            const siblingResult = await connection.execute<PostRow>(
                `SELECT p.id,
                        p.parent_post_id,
                        p.created_at,
                        p.contents,
                        NVL(u.sex_code, '') AS sex_code
                   FROM murm_post p
                   JOIN murm_user u ON u.id = p.user_id
                  WHERE p.parent_post_id = :parent_id
                    AND p.id <> :post_id
                    AND LOWER(TRIM(p.status)) = 'published'
                  ORDER BY p.created_at ASC, p.id ASC`,
                {parent_id: parentId, post_id: postId},
            );
            siblingStubs = (siblingResult.rows || []).map(row => ({
                id: Number(row.ID),
                parentPostId: Number(row.PARENT_POST_ID),
                createdAt: new Date(String(row.CREATED_AT)).getTime(),
                textPreview: String(row.CONTENTS || '').slice(0, 140),
                sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
                isStub: true,
            }));
        }
        return {posts: mapPostRows(fullResult.rows || []), siblingStubs};
    });
}

export async function getPostBranch(postId: number): Promise<unknown[]> {
    return withConnection(async connection => {
        const result = await connection.execute<PostRow>(
            `SELECT p.id,
                    p.user_id,
                    p.parent_post_id,
                    p.contents,
                    NVL(p.positive_count, 0) AS positive_count,
                    NVL(p.negative_count, 0) AS negative_count,
                    NVL(p.share_count, 0) AS share_count,
                    p.created_at,
                    u.username,
                    NVL(u.sex_code, '') AS sex_code,
                    parent_user.username AS parent_username
               FROM murm_post p
               JOIN murm_user u ON u.id = p.user_id
               LEFT JOIN murm_post parent_post ON parent_post.id = p.parent_post_id
               LEFT JOIN murm_user parent_user ON parent_user.id = parent_post.user_id
              WHERE LOWER(TRIM(p.status)) = 'published'
                AND p.id IN (
                    SELECT id
                      FROM murm_post
                     WHERE LOWER(TRIM(status)) = 'published'
                     START WITH id = :post_id
                     CONNECT BY PRIOR id = parent_post_id
                )
              ORDER BY p.created_at ASC`,
            {post_id: postId},
        );
        if (!result.rows?.length) throw new Error('POST_NAO_ENCONTRADO');
        return mapPostRows(result.rows);
    });
}

export async function createPost(userId: number, contents: string, parentPostId: number | null = null,): Promise<number> {
    return withConnection(async connection => {
        const result = await connection.execute(
            `
                BEGIN
                    INSERT INTO murm_post
                    (
                        user_id,
                        parent_post_id,
                        contents
                    )
                    VALUES
                    (
                        :user_id,
                        :parent_post_id,
                        :contents
                    )
                    RETURNING id INTO :id;
                END;
            `,
            {
                user_id: userId,
                parent_post_id: parentPostId,
                contents,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
            },
            {
                autoCommit: true,
            },
        );

        const outBinds = result.outBinds as {
            id: number;
        };

        return Number(outBinds.id);
    });
}

export async function vote(postId: number, userId: number, value: -1 | 1): Promise<void> {
    await withConnection(async connection => {
        const current = await connection.execute<Record<string, unknown>>(
            `SELECT vote_value
             FROM murm_vote
             WHERE post_id = :post_id
                 AND user_id = :user_id`,
            {post_id: postId, user_id: userId},
        );

        const existing = current.rows?.[0];

        if (existing && Number(existing.VOTE_VALUE) === value) {
            await connection.execute(
                `DELETE
                 FROM murm_vote
                 WHERE post_id = :post_id
                     AND user_id = :user_id`,
                {post_id: postId, user_id: userId},
                {autoCommit: true},
            );
            return;
        }

        await connection.execute(
            `MERGE INTO murm_vote target
             USING (SELECT :post_id AS post_id, :user_id AS user_id, :vote_value AS vote_value FROM dual) source
             ON (target.post_id = source.post_id AND target.user_id = source.user_id)
             WHEN MATCHED THEN
                 UPDATE SET target.vote_value = source.vote_value,
                            target.updated_at = SYSTIMESTAMP
             WHEN NOT MATCHED THEN
                 INSERT (post_id, user_id, vote_value)
                 VALUES (source.post_id, source.user_id, source.vote_value)`,
            {post_id: postId, user_id: userId, vote_value: value},
            {autoCommit: true},
        );
    });
}

export async function share(postId: number, userId: number): Promise<void> {
    await withConnection(async connection => {
        await connection.execute(
            `INSERT INTO murm_share
             (
                 post_id,
                 user_id,
                 share_type
             )
             VALUES (
                 :post_id,
                 :user_id,
                 'link'
             )`,
            {post_id: postId, user_id: userId},
            {autoCommit: true},
        );
    });
}

export async function deletePost(postId: number, userId: number): Promise<void> {
    await withConnection(async connection => {
        const owner = await connection.execute<Record<string, unknown>>(
            `SELECT id
             FROM murm_post
             WHERE id = :post_id
                 AND user_id = :user_id
                 AND parent_post_id IS NULL
                 AND status = 'published'`,
            {post_id: postId, user_id: userId},
        );
        if (!owner.rows?.length) throw new Error('POST_NAO_ENCONTRADO');

        await connection.execute(
            `UPDATE murm_post
             SET status = 'deleted',
                 deleted_at = systimestamp,
                 deleted_by_user_id = :user_id,
                 updated_at = systimestamp
             WHERE (id = :post_id OR parent_post_id = :post_id)
                 AND status = 'published'`,
            {post_id: postId, user_id: userId},
            {autoCommit: true},
        );
    });
}

export async function deleteReply(replyId: number, userId: number): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `UPDATE murm_post
             SET status = 'deleted',
                 deleted_at = systimestamp,
                 deleted_by_user_id = :user_id,
                 updated_at = systimestamp
             WHERE id = :reply_id
                 AND user_id = :user_id
                 AND parent_post_id IS NOT NULL
                 AND status = 'published'`,
            {reply_id: replyId, user_id: userId},
            {autoCommit: true},
        );
        if (!result.rowsAffected) throw new Error('RESPOSTA_NAO_ENCONTRADA');
    });
}

export async function restoreReply(replyId: number, userId: number): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `UPDATE murm_post
             SET status = 'published',
                 deleted_at = NULL,
                 deleted_by_user_id = NULL,
                 updated_at = systimestamp
             WHERE id = :reply_id
                 AND user_id = :user_id
                 AND deleted_by_user_id = :user_id
                 AND parent_post_id IS NOT NULL
                 AND status = 'deleted'`,
            {reply_id: replyId, user_id: userId},
            {autoCommit: true},
        );
        if (!result.rowsAffected) throw new Error('RESPOSTA_NAO_ENCONTRADA');
    });
}
