import oracledb from 'oracledb';
import { withConnection } from '../oracle';

export async function listPosts(currentUserId: number | null): Promise<unknown[]> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT p.id,
                    p.user_id,
                    p.parent_post_id,
                    p.contents,
                    p.positive_count,
                    p.negative_count,
                    p.share_count,
                    p.status,
                    p.created_at,
                    u.username,
                    NVL(u.sex_code, '') AS sex_code,
                    NVL(u.avatar_url, '') AS avatar_url,
                    NVL(v.vote_value, 0) AS my_vote
             FROM murm_post p
             JOIN murm_user u
               ON u.id = p.user_id
             LEFT JOIN murm_vote v
               ON v.post_id = p.id
              AND v.user_id = :current_user_id
             WHERE p.status = 'published'
             ORDER BY p.created_at DESC`,
            { current_user_id: currentUserId },
        );

        const rows = result.rows || [];
        const roots = rows.filter(row => row.PARENT_POST_ID == null);
        const repliesByParent = new Map<number, Record<string, unknown>[]>();

        rows.filter(row => row.PARENT_POST_ID != null).forEach(row => {
            const parentId = Number(row.PARENT_POST_ID);
            const list = repliesByParent.get(parentId) || [];
            list.push(row);
            repliesByParent.set(parentId, list);
        });

        return roots.map(row => ({
            id: Number(row.ID),
            userId: Number(row.USER_ID),
            author: String(row.USERNAME),
            sexCode: String(row.SEX_CODE || ''),
            avatarUrl: String(row.AVATAR_URL || ''),
            text: String(row.CONTENTS),
            positive: Number(row.POSITIVE_COUNT),
            negative: Number(row.NEGATIVE_COUNT),
            shares: Number(row.SHARE_COUNT),
            myVote: Number(row.MY_VOTE),
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
            replies: (repliesByParent.get(Number(row.ID)) || []).map(reply => ({
                id: Number(reply.ID),
                userId: Number(reply.USER_ID),
                author: String(reply.USERNAME),
                text: String(reply.CONTENTS),
                createdAt: new Date(String(reply.CREATED_AT)).getTime(),
            })),
        }));
    });
}

export async function createPost(userId: number, contents: string, parentPostId: number | null = null): Promise<number> {
    return withConnection(async connection => {
        const result = await connection.execute(
            `INSERT INTO murm_post
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
             RETURNING id INTO :id`,
            {
                user_id: userId,
                parent_post_id: parentPostId,
                contents,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            },
            { autoCommit: true },
        );
        return Number((result.outBinds as { id: number[] }).id[0]);
    });
}

export async function vote(postId: number, userId: number, value: -1 | 1): Promise<void> {
    await withConnection(async connection => {
        const current = await connection.execute<Record<string, unknown>>(
            `SELECT vote_value
             FROM murm_vote
             WHERE post_id = :post_id
               AND user_id = :user_id`,
            { post_id: postId, user_id: userId },
        );

        const existing = current.rows?.[0];

        if (existing && Number(existing.VOTE_VALUE) === value) {
            await connection.execute(
                `DELETE FROM murm_vote
                 WHERE post_id = :post_id
                   AND user_id = :user_id`,
                { post_id: postId, user_id: userId },
                { autoCommit: true },
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
            { post_id: postId, user_id: userId, vote_value: value },
            { autoCommit: true },
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
             VALUES
             (
                 :post_id,
                 :user_id,
                 'link'
             )`,
            { post_id: postId, user_id: userId },
            { autoCommit: true },
        );
    });
}

export async function deleteReply(replyId: number, userId: number): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `UPDATE murm_post
             SET status = 'deleted',
                 deleted_at = SYSTIMESTAMP,
                 deleted_by_user_id = :user_id,
                 updated_at = SYSTIMESTAMP
             WHERE id = :reply_id
               AND user_id = :user_id
               AND parent_post_id IS NOT NULL
               AND status = 'published'`,
            { reply_id: replyId, user_id: userId },
            { autoCommit: true },
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
                 updated_at = SYSTIMESTAMP
             WHERE id = :reply_id
               AND user_id = :user_id
               AND deleted_by_user_id = :user_id
               AND parent_post_id IS NOT NULL
               AND status = 'deleted'`,
            { reply_id: replyId, user_id: userId },
            { autoCommit: true },
        );
        if (!result.rowsAffected) throw new Error('RESPOSTA_NAO_ENCONTRADA');
    });
}
