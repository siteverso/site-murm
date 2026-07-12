// noinspection TypeScriptUnresolvedReference,SqlResolve,TypeScriptValidateTypes

import oracledb from 'oracledb';
import {withConnection} from '../oracle';
import {avatarSql, getUserSchema} from '../user-schema';

export async function listPosts(currentUserId: number | null, profileUsername: string | null = null, preferredLanguageCode: string | null = null): Promise<unknown[]> {
    return withConnection(async connection => {
        const userSchema = await getUserSchema(connection);
        const userAvatarSql = avatarSql(userSchema, 'u');

        // Os cards principais continuam sendo somente murmúrios raiz.
        // Na Home, carregamos separadamente apenas duas respostas diretas por raiz
        // para uma prévia compacta; níveis mais profundos ficam na página da conversa.
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT p.id,
                 p.user_id,
                 p.parent_post_id,
                 p.contents,
                 nvl(p.positive_count, 0) AS positive_count,
                 nvl(p.negative_count, 0) AS negative_count,
                 nvl(p.share_count, 0) AS share_count,
                 p.created_at,
                 p.status,
                 nvl(p.visibility_code, 'public') AS visibility_code,
                 nvl(p.language_code, nvl(u.language_code, 'pt-BR')) AS language_code,
                 u.username,
                 u.created_at AS user_created_at,
                 (SELECT count(*) FROM murm_post activity_post
                  WHERE activity_post.user_id = u.id
                    AND lower(trim(activity_post.status)) = 'published'
                    AND lower(trim(activity_post.post_type)) = 'murmur') AS user_activity_count,
                 nvl(u.sex_code, '') AS sex_code,
                 ${userAvatarSql} AS avatar_url,
                 nvl((SELECT max(v.vote_value)
                      FROM murm_vote v
                      WHERE v.post_id = p.id
                          AND v.user_id = :current_user_id), 0) AS my_vote,
                 CASE WHEN exists (SELECT 1
                                   FROM murm_post own_reply
                                   WHERE own_reply.parent_post_id = p.id
                                       AND own_reply.user_id = :current_user_id
                                       AND lower(trim(own_reply.status)) = 'published'
                                       AND lower(trim(own_reply.post_type)) = 'murmur') THEN 1
                      ELSE 0 END AS has_my_reply,
                 (SELECT count(*)
                  FROM murm_post reply
                  WHERE reply.parent_post_id = p.id
                      AND lower(trim(reply.status)) = 'published'
                      AND lower(trim(reply.post_type)) = 'murmur') AS reply_count
             FROM murm_post p
             JOIN murm_user u
                  ON u.id = p.user_id
             WHERE lower(trim(p.status)) = 'published'
                 AND lower(trim(p.post_type)) = 'murmur'
                 AND p.parent_post_id IS NULL
                 AND (
                 :profile_username IS NULL
                     OR p.user_id = (SELECT profile_user.id
                                     FROM murm_user profile_user
                                     WHERE lower(profile_user.username) = lower(:profile_username) FETCH FIRST 1 ROW ONLY)
                 )
             ORDER BY CASE
                 WHEN :profile_username IS NULL
                     AND :preferred_language_code IS NOT NULL
                     AND nvl(p.language_code, nvl(u.language_code, 'pt-BR')) = :preferred_language_code
                     THEN 0
                 ELSE 1
                 END,
                 p.created_at DESC`,
            {profile_username: profileUsername, preferred_language_code: preferredLanguageCode, current_user_id: currentUserId},
        );

        const roots = (result.rows || []).map(row => ({
            id: Number(row.ID),
            userId: Number(row.USER_ID),
            parentPostId: null,
            parentAuthor: '',
            author: String(row.USERNAME || ''),
            userCreatedAt: new Date(String(row.USER_CREATED_AT || row.CREATED_AT)).getTime(),
            userActivityCount: Number(row.USER_ACTIVITY_COUNT || 0),
            sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
            avatarUrl: String(row.AVATAR_URL || ''),
            text: String(row.CONTENTS || ''),
            languageCode: String(row.LANGUAGE_CODE || 'pt-BR'),
            positive: Number(row.POSITIVE_COUNT || 0),
            negative: Number(row.NEGATIVE_COUNT || 0),
            shares: Number(row.SHARE_COUNT || 0),
            myVote: Number(row.MY_VOTE || 0),
            hasMyReply: Number(row.HAS_MY_REPLY || 0) === 1,
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
            isPrivate: String(row.VISIBILITY_CODE || 'public').trim().toLowerCase() === 'private',
            canViewPrivate: true,
            isPrivateRedacted: false,
            replyCount: Number(row.REPLY_COUNT || 0),
        }));

        // Home e listagem do perfil usam a mesma prévia compacta.
        // A conversa específica continua sendo carregada pela rota própria, com recursão completa.
        if (roots.length === 0) return roots;

        const previewResult = await connection.execute<Record<string, unknown>>(
            `SELECT *
             FROM (
                 SELECT reply.id,
                     reply.user_id,
                     reply.parent_post_id,
                     reply.contents,
                     nvl(reply.positive_count, 0) AS positive_count,
                     nvl(reply.negative_count, 0) AS negative_count,
                     nvl(reply.share_count, 0) AS share_count,
                     reply.created_at,
                     reply.status,
                     nvl(reply.visibility_code, 'public') AS visibility_code,
                     nvl(reply.language_code, nvl(reply_user.language_code, 'pt-BR')) AS language_code,
                     reply_user.username,
                     nvl(reply_user.sex_code, '') AS sex_code,
                     ${userAvatarSql.replaceAll('u.', 'reply_user.')} AS avatar_url,
                     parent_user.username AS parent_username,
                     nvl((SELECT max(v.vote_value)
                          FROM murm_vote v
                          WHERE v.post_id = reply.id
                              AND v.user_id = :current_user_id), 0) AS my_vote,
                     CASE WHEN exists (SELECT 1
                                       FROM murm_post own_reply
                                       WHERE own_reply.parent_post_id = reply.id
                                           AND own_reply.user_id = :current_user_id
                                           AND lower(trim(own_reply.status)) = 'published'
                                           AND lower(trim(own_reply.post_type)) = 'murmur') THEN 1
                          ELSE 0 END AS has_my_reply,
                     CASE WHEN nvl(reply.visibility_code, 'public') <> 'private'
                               OR reply.user_id = :current_user_id
                               OR parent.user_id = :current_user_id THEN 1
                          ELSE 0 END AS can_view_private,
                     row_number() OVER (
                         PARTITION BY reply.parent_post_id
                         ORDER BY CASE WHEN reply.user_id = :current_user_id THEN 0 ELSE 1 END,
                                  reply.created_at DESC,
                                  reply.id DESC
                     ) AS preview_rank
                 FROM murm_post reply
                 JOIN murm_user reply_user ON reply_user.id = reply.user_id
                 JOIN murm_post parent ON parent.id = reply.parent_post_id
                 JOIN murm_user parent_user ON parent_user.id = parent.user_id
                 WHERE lower(trim(reply.status)) = 'published'
                     AND lower(trim(reply.post_type)) = 'murmur'
                     AND lower(trim(parent.status)) = 'published'
                     AND lower(trim(parent.post_type)) = 'murmur'
                     AND parent.parent_post_id IS NULL
                     AND (
                         :profile_username IS NULL
                         OR parent.user_id = (SELECT profile_user.id
                                              FROM murm_user profile_user
                                              WHERE lower(profile_user.username) = lower(:profile_username)
                                              FETCH FIRST 1 ROW ONLY)
                     )
             )
             WHERE preview_rank <= 2
             ORDER BY parent_post_id, created_at DESC, id DESC`,
            {current_user_id: currentUserId, profile_username: profileUsername},
        );

        const previews = (previewResult.rows || []).map(row => {
            const isPrivate = String(row.VISIBILITY_CODE || 'public').trim().toLowerCase() === 'private';
            const canViewPrivate = !isPrivate || Number(row.CAN_VIEW_PRIVATE || 0) === 1;
            const isPrivateRedacted = isPrivate && !canViewPrivate;
            return {
                id: Number(row.ID),
                userId: Number(row.USER_ID),
                parentPostId: Number(row.PARENT_POST_ID),
                parentAuthor: String(row.PARENT_USERNAME || ''),
                author: String(row.USERNAME || ''),
                sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
                avatarUrl: String(row.AVATAR_URL || ''),
                text: isPrivateRedacted ? '' : String(row.CONTENTS || ''),
                languageCode: String(row.LANGUAGE_CODE || 'pt-BR'),
                positive: isPrivateRedacted ? 0 : Number(row.POSITIVE_COUNT || 0),
                negative: isPrivateRedacted ? 0 : Number(row.NEGATIVE_COUNT || 0),
                shares: isPrivateRedacted ? 0 : Number(row.SHARE_COUNT || 0),
                myVote: isPrivateRedacted ? 0 : Number(row.MY_VOTE || 0),
                hasMyReply: isPrivateRedacted ? false : Number(row.HAS_MY_REPLY || 0) === 1,
                createdAt: new Date(String(row.CREATED_AT)).getTime(),
                isPrivate,
                canViewPrivate,
                isPrivateRedacted,
                replyCount: 0,
            };
        });

        return [...roots, ...previews];
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
    return rows.map(row => {
        const isPrivate = String(row.VISIBILITY_CODE || 'public').trim().toLowerCase() === 'private';
        const canViewPrivate = !isPrivate || Number(row.CAN_VIEW_PRIVATE || 0) === 1;
        const isPrivateRedacted = isPrivate && !canViewPrivate;
        return {
            id: Number(row.ID),
            userId: Number(row.USER_ID || 0),
            parentPostId: row.PARENT_POST_ID == null ? null : Number(row.PARENT_POST_ID),
            parentAuthor: String(row.PARENT_USERNAME || ''),
            author: String(row.USERNAME || ''),
            isDeleted: String(row.STATUS || '').trim().toLowerCase() === 'deleted',
            sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
            avatarUrl: String(row.AVATAR_URL || ''),
            text: isPrivateRedacted ? '' : String(row.CONTENTS || ''),
            positive: isPrivateRedacted ? 0 : Number(row.POSITIVE_COUNT || 0),
            negative: isPrivateRedacted ? 0 : Number(row.NEGATIVE_COUNT || 0),
            shares: isPrivateRedacted ? 0 : Number(row.SHARE_COUNT || 0),
            myVote: isPrivateRedacted ? 0 : Number(row.MY_VOTE || 0),
            hasMyReply: isPrivateRedacted ? false : Number(row.HAS_MY_REPLY || 0) === 1,
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
            isPrivate,
            canViewPrivate,
            isPrivateRedacted,
            replyCount: isPrivateRedacted ? 0 : replyCounts.get(Number(row.ID)) || 0,
        };
    });
}

export async function listSpecificThread(postId: number, currentUserId: number | null = null): Promise<{ posts: unknown[]; siblingStubs: unknown[] }> {
    return withConnection(async connection => {
        const userSchema = await getUserSchema(connection);
        const userAvatarSql = avatarSql(userSchema, 'u');
        const rootResult = await connection.execute<PostRow>(
            `SELECT parent_post_id,
                 status
             FROM murm_post
             WHERE id = :post_id
                 AND lower(trim(status)) IN ('published', 'deleted')
                 AND lower(trim(post_type)) = 'murmur'`,
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
                 nvl(p.positive_count, 0) AS positive_count,
                 nvl(p.negative_count, 0) AS negative_count,
                 nvl(p.share_count, 0) AS share_count,
                 p.created_at,
                 p.status,
                 nvl(p.visibility_code, 'public') AS visibility_code,
                 u.username,
                 nvl(u.sex_code, '') AS sex_code,
                 ${userAvatarSql} AS avatar_url,
                 parent_user.username AS parent_username,
                 nvl((SELECT max(v.vote_value) FROM murm_vote v WHERE v.post_id = p.id AND v.user_id = :current_user_id), 0) AS my_vote,
                 CASE WHEN exists (SELECT 1
                                   FROM murm_post own_reply
                                   WHERE own_reply.parent_post_id = p.id
                                       AND own_reply.user_id = :current_user_id
                                       AND lower(trim(own_reply.status)) = 'published'
                                       AND lower(trim(own_reply.post_type)) = 'murmur') THEN 1
                      ELSE 0 END AS has_my_reply,
                 CASE WHEN nvl(p.visibility_code, 'public') <> 'private'
                           OR p.parent_post_id IS NULL
                           OR p.user_id = :current_user_id
                           OR parent_post.user_id = :current_user_id THEN 1
                      ELSE 0 END AS can_view_private
             FROM murm_post p
             JOIN murm_user u ON u.id = p.user_id
             LEFT JOIN murm_post parent_post ON parent_post.id = p.parent_post_id
             LEFT JOIN murm_user parent_user ON parent_user.id = parent_post.user_id
             WHERE lower(trim(p.post_type)) = 'murmur'
                 AND (
                 p.id IN (SELECT id
                          FROM murm_post
                          WHERE lower(trim(status)) IN ('published', 'deleted')
                              AND lower(trim(post_type)) = 'murmur'
                              START
                          WITH id = :post_id
                              CONNECT BY PRIOR parent_post_id = id)
                     OR p.id IN (SELECT id
                                 FROM murm_post
                                 WHERE lower(trim(status)) = 'published'
                                     AND lower(trim(post_type)) = 'murmur'
                                     START
                                 WITH parent_post_id = :post_id
                                     CONNECT BY PRIOR id = parent_post_id)
                 )
             ORDER BY p.created_at ASC`,
            {post_id: postId, current_user_id: currentUserId},
        );

        let siblingStubs: unknown[] = [];
        if (parentId != null) {
            const siblingResult = await connection.execute<PostRow>(
                `SELECT p.id,
                     p.parent_post_id,
                     p.created_at,
                     p.contents,
                     nvl(p.visibility_code, 'public') AS visibility_code,
                     CASE WHEN nvl(p.visibility_code, 'public') <> 'private'
                               OR p.user_id = :current_user_id
                               OR parent_post.user_id = :current_user_id THEN 1
                          ELSE 0 END AS can_view_private,
                     nvl(u.sex_code, '') AS sex_code
                 FROM murm_post p
                 JOIN murm_user u ON u.id = p.user_id
                 LEFT JOIN murm_post parent_post ON parent_post.id = p.parent_post_id
                 WHERE p.parent_post_id = :parent_id
                     AND p.id <> :post_id
                     AND lower(trim(p.status)) = 'published'
                     AND lower(trim(p.post_type)) = 'murmur'
                 ORDER BY p.created_at ASC, p.id ASC`,
                {parent_id: parentId, post_id: postId, current_user_id: currentUserId},
            );
            siblingStubs = (siblingResult.rows || []).map(row => {
                const isPrivate = String(row.VISIBILITY_CODE || 'public').trim().toLowerCase() === 'private';
                const canViewPrivate = !isPrivate || Number(row.CAN_VIEW_PRIVATE || 0) === 1;
                return {
                    id: Number(row.ID),
                    parentPostId: Number(row.PARENT_POST_ID),
                    createdAt: new Date(String(row.CREATED_AT)).getTime(),
                    textPreview: canViewPrivate ? String(row.CONTENTS || '').slice(0, 140) : 'Resposta privada',
                    sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
                    isPrivate,
                    canViewPrivate,
                    isStub: true,
                };
            });
        }
        const mappedPosts = mapPostRows(fullResult.rows || []) as Array<Record<string, unknown>>;

        // A FK da resposta pode continuar apontando para um pai já removido fisicamente.
        // Nesse caso, injeta somente um mock neutro para preservar e renderizar a árvore.
        if (parentId != null && !mappedPosts.some(post => Number(post.id) === parentId)) {
            const selectedPost = mappedPosts.find(post => Number(post.id) === postId);
            mappedPosts.unshift({
                id: parentId,
                userId: 0,
                parentPostId: null,
                parentAuthor: '',
                author: '',
                isDeleted: true,
                sexCode: '',
                avatarUrl: '',
                text: '',
                positive: 0,
                negative: 0,
                shares: 0,
                myVote: 0,
                hasMyReply: false,
                createdAt: Number(selectedPost?.createdAt || Date.now()),
                isPrivate: false,
                canViewPrivate: true,
                isPrivateRedacted: false,
                replyCount: mappedPosts.filter(post => Number(post.parentPostId) === parentId).length,
            });
        }

        return {posts: mappedPosts, siblingStubs};
    });
}

export async function getPostBranch(postId: number, currentUserId: number | null = null): Promise<unknown[]> {
    return withConnection(async connection => {
        const userSchema = await getUserSchema(connection);
        const userAvatarSql = avatarSql(userSchema, 'u');
        const result = await connection.execute<PostRow>(
            `SELECT p.id,
                 p.user_id,
                 p.parent_post_id,
                 p.contents,
                 nvl(p.positive_count, 0) AS positive_count,
                 nvl(p.negative_count, 0) AS negative_count,
                 nvl(p.share_count, 0) AS share_count,
                 p.created_at,
                 p.status,
                 nvl(p.visibility_code, 'public') AS visibility_code,
                 u.username,
                 nvl(u.sex_code, '') AS sex_code,
                 ${userAvatarSql} AS avatar_url,
                 parent_user.username AS parent_username,
                 nvl((SELECT max(v.vote_value) FROM murm_vote v WHERE v.post_id = p.id AND v.user_id = :current_user_id), 0) AS my_vote,
                 CASE WHEN exists (SELECT 1
                                   FROM murm_post own_reply
                                   WHERE own_reply.parent_post_id = p.id
                                       AND own_reply.user_id = :current_user_id
                                       AND lower(trim(own_reply.status)) = 'published'
                                       AND lower(trim(own_reply.post_type)) = 'murmur') THEN 1
                      ELSE 0 END AS has_my_reply,
                 CASE WHEN nvl(p.visibility_code, 'public') <> 'private'
                           OR p.parent_post_id IS NULL
                           OR p.user_id = :current_user_id
                           OR parent_post.user_id = :current_user_id THEN 1
                      ELSE 0 END AS can_view_private
             FROM murm_post p
             JOIN murm_user u ON u.id = p.user_id
             LEFT JOIN murm_post parent_post ON parent_post.id = p.parent_post_id
             LEFT JOIN murm_user parent_user ON parent_user.id = parent_post.user_id
             WHERE lower(trim(p.status)) = 'published'
                 AND lower(trim(p.post_type)) = 'murmur'
                 AND p.id IN (SELECT id
                              FROM murm_post
                              WHERE lower(trim(status)) = 'published'
                                  AND lower(trim(post_type)) = 'murmur'
                                  START
                              WITH id = :post_id
                                  CONNECT BY PRIOR id = parent_post_id)
             ORDER BY p.created_at ASC`,
            {post_id: postId, current_user_id: currentUserId},
        );
        if (!result.rows?.length) throw new Error('POST_NAO_ENCONTRADO');
        return mapPostRows(result.rows);
    });
}

export async function createPost(userId: number, contents: string, parentPostId: number | null = null, isPrivate = false): Promise<number> {
    return withConnection(async connection => {
        const result = await connection.execute(
            `
                BEGIN
                    INSERT INTO murm_post
                    (
                        user_id,
                        parent_post_id,
                        contents,
                        post_type,
                        language_code,
                        visibility_code,
                        recipient_user_id
                    )
                    VALUES
                    (
                        :user_id,
                        :parent_post_id,
                        :contents,
                        'murmur',
                        (SELECT NVL(language_code, 'pt-BR') FROM murm_user WHERE id = :user_id),
                        CASE WHEN :is_private = 1 AND :parent_post_id IS NOT NULL THEN 'private' ELSE 'public' END,
                        CASE WHEN :is_private = 1 AND :parent_post_id IS NOT NULL
                             THEN (SELECT user_id FROM murm_post WHERE id = :parent_post_id)
                             ELSE NULL END
                    )
                    RETURNING id INTO :id;
                END;
            `,
            {
                user_id: userId,
                parent_post_id: parentPostId,
                contents,
                is_private: isPrivate ? 1 : 0,
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

export async function updatePost(postId: number, userId: number, contents: string): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `UPDATE murm_post
             SET contents = :contents,
                 updated_at = systimestamp
             WHERE id = :post_id
                 AND user_id = :user_id
                 AND status = 'published'
                 AND lower(trim(post_type)) = 'murmur'`,
            {post_id: postId, user_id: userId, contents},
            {autoCommit: true},
        );
        if (Number(result.rowsAffected || 0) !== 1) throw new Error('POST_NAO_ENCONTRADO');
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
                 AND status = 'published'
                 AND lower(trim(post_type)) = 'murmur'`,
            {post_id: postId, user_id: userId},
        );
        if (!owner.rows?.length) throw new Error('POST_NAO_ENCONTRADO');

        await connection.execute(
            `UPDATE murm_post
             SET status = 'deleted',
                 deleted_at = systimestamp,
                 deleted_by_user_id = :user_id,
                 updated_at = systimestamp
             WHERE id = :post_id
                 AND status = 'published'
                 AND lower(trim(post_type)) = 'murmur'`,
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
                 AND status = 'published'
                 AND lower(trim(post_type)) = 'murmur'`,
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
                 AND status = 'deleted'
                 AND lower(trim(post_type)) = 'murmur'`,
            {reply_id: replyId, user_id: userId},
            {autoCommit: true},
        );
        if (!result.rowsAffected) throw new Error('RESPOSTA_NAO_ENCONTRADA');
    });
}


type ReplyHistoryPost = {
    id: number;
    userId: number;
    parentPostId: number | null;
    parentAuthor: string;
    author: string;
    isDeleted: boolean;
    sexCode: string;
    avatarUrl: string;
    text: string;
    positive: number;
    negative: number;
    shares: number;
    myVote: number;
    hasMyReply: boolean;
    createdAt: number;
    replyCount: number;
    isPrivate: boolean;
    canViewPrivate: boolean;
    isPrivateRedacted: boolean;
};

export type ReplyHistoryGroup = {
    rootPostId: number;
    posts: ReplyHistoryPost[];
};

function mapReplyHistoryRows(rows: PostRow[]): ReplyHistoryPost[] {
    const uniqueRows = new Map<number, PostRow>();
    rows.forEach(row => {
        const id = Number(row.ID || 0);
        if (!id) return;
        uniqueRows.set(id, row);
    });

    const dedupedRows = [...uniqueRows.values()];
    const replyCounts = new Map<number, number>();
    dedupedRows.forEach(row => {
        if (row.PARENT_POST_ID == null) return;
        const parentId = Number(row.PARENT_POST_ID);
        replyCounts.set(parentId, (replyCounts.get(parentId) || 0) + 1);
    });

    return dedupedRows.map(row => {
        const isPrivate = String(row.VISIBILITY_CODE || 'public').trim().toLowerCase() === 'private';
        const canViewPrivate = !isPrivate || Number(row.CAN_VIEW_PRIVATE || 0) === 1;
        const isPrivateRedacted = isPrivate && !canViewPrivate;
        return {
            id: Number(row.ID),
            userId: Number(row.USER_ID || 0),
            parentPostId: row.PARENT_POST_ID == null ? null : Number(row.PARENT_POST_ID),
            parentAuthor: String(row.PARENT_USERNAME || ''),
            author: String(row.USERNAME || ''),
            isDeleted: String(row.STATUS || '').trim().toLowerCase() === 'deleted',
            sexCode: String(row.SEX_CODE || '').trim().toUpperCase(),
            avatarUrl: String(row.AVATAR_URL || ''),
            text: isPrivateRedacted ? '' : String(row.CONTENTS || ''),
            positive: isPrivateRedacted ? 0 : Number(row.POSITIVE_COUNT || 0),
            negative: isPrivateRedacted ? 0 : Number(row.NEGATIVE_COUNT || 0),
            shares: isPrivateRedacted ? 0 : Number(row.SHARE_COUNT || 0),
            myVote: isPrivateRedacted ? 0 : Number(row.MY_VOTE || 0),
            hasMyReply: isPrivateRedacted ? false : Number(row.HAS_MY_REPLY || 0) === 1,
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
            isPrivate,
            canViewPrivate,
            isPrivateRedacted,
            replyCount: isPrivateRedacted ? 0 : replyCounts.get(Number(row.ID)) || 0,
        };
    });
}

async function fetchReplyHistoryBranch(connection: oracledb.Connection, replyId: number, viewerUserId: number): Promise<ReplyHistoryPost[]> {
    const userSchema = await getUserSchema(connection);
    const userAvatarSql = avatarSql(userSchema, 'u');
    const result = await connection.execute<PostRow>(
        `SELECT p.id,
             p.user_id,
             p.parent_post_id,
             p.contents,
             nvl(p.positive_count, 0) AS positive_count,
             nvl(p.negative_count, 0) AS negative_count,
             nvl(p.share_count, 0) AS share_count,
             p.created_at,
             p.status,
             nvl(p.visibility_code, 'public') AS visibility_code,
             u.username,
             nvl(u.sex_code, '') AS sex_code,
             ${userAvatarSql} AS avatar_url,
             parent_user.username AS parent_username,
             CASE WHEN nvl(p.visibility_code, 'public') <> 'private'
                       OR p.parent_post_id IS NULL
                       OR p.user_id = :viewer_user_id
                       OR parent_post.user_id = :viewer_user_id THEN 1
                  ELSE 0 END AS can_view_private
         FROM murm_post p
         JOIN murm_user u
              ON u.id = p.user_id
         LEFT JOIN murm_post parent_post
                   ON parent_post.id = p.parent_post_id
         LEFT JOIN murm_user parent_user
                   ON parent_user.id = parent_post.user_id
         WHERE lower(trim(p.post_type)) = 'murmur'
             AND (
             (p.id = :reply_id AND lower(trim(p.status)) IN ('published', 'deleted'))
                 OR p.id IN (SELECT id
                             FROM murm_post
                             WHERE lower(trim(post_type)) = 'murmur'
                                 AND lower(trim(status)) IN ('published', 'deleted')
                                 START
                             WITH id = :reply_id
                                 CONNECT BY PRIOR parent_post_id = id)
                 OR p.id IN (SELECT id
                             FROM murm_post
                             WHERE lower(trim(post_type)) = 'murmur'
                                 AND lower(trim(status)) = 'published'
                                 START
                             WITH parent_post_id = :reply_id
                                 CONNECT BY PRIOR id = parent_post_id)
             )
         ORDER BY p.created_at ASC, p.id ASC`,
        {reply_id: replyId, viewer_user_id: viewerUserId},
    );

    const mappedPosts = mapReplyHistoryRows(result.rows || []);
    const byId = new Map(mappedPosts.map(post => [String(post.id), post]));
    const selectedPost = byId.get(String(replyId));
    if (!selectedPost) return mappedPosts;

    if (selectedPost.parentPostId != null && !byId.has(String(selectedPost.parentPostId))) {
        mappedPosts.unshift({
            id: Number(selectedPost.parentPostId),
            userId: 0,
            parentPostId: null,
            parentAuthor: '',
            author: '',
            isDeleted: true,
            sexCode: '',
            avatarUrl: '',
            text: '',
            positive: 0,
            negative: 0,
            shares: 0,
            myVote: 0,
            hasMyReply: false,
            createdAt: Number(selectedPost.createdAt || Date.now()),
            isPrivate: false,
            canViewPrivate: true,
            isPrivateRedacted: false,
            replyCount: mappedPosts.filter(post => Number(post.parentPostId) === Number(selectedPost.parentPostId)).length,
        });
    }

    return mappedPosts;
}

function findReplyHistoryRootId(posts: ReplyHistoryPost[], selectedReplyId: number): number | null {
    const byId = new Map(posts.map(post => [String(post.id), post]));
    let current = byId.get(String(selectedReplyId));
    if (!current) return null;

    while (current?.parentPostId != null) {
        const parent = byId.get(String(current.parentPostId));
        if (!parent) return Number(current.parentPostId);
        current = parent;
    }

    return current ? Number(current.id) : null;
}

export async function listReplyHistoryByUser(userId: number, viewerUserId: number = userId): Promise<ReplyHistoryGroup[]> {
    return withConnection(async connection => {
        const result = await connection.execute<PostRow>(
            `SELECT r.id AS reply_id
             FROM murm_post r
             WHERE r.user_id = :user_id
                 AND r.parent_post_id IS NOT NULL
                 AND lower(trim(r.status)) = 'published'
                 AND lower(trim(r.post_type)) = 'murmur'
             ORDER BY r.created_at DESC, r.id DESC`,
            {user_id: userId},
        );

        const groups = new Map<number, { rootPostId: number; posts: Map<string, ReplyHistoryPost>; latestActivity: number }>();
        for (const row of result.rows || []) {
            const replyId = Number(row.REPLY_ID || 0);
            if (!replyId) continue;

            const branchPosts = await fetchReplyHistoryBranch(connection, replyId, viewerUserId);
            if (!branchPosts.length) continue;

            const rootPostId = findReplyHistoryRootId(branchPosts, replyId);
            if (!rootPostId) continue;

            const latestActivity = Math.max(...branchPosts.map(post => Number(post.createdAt || 0)), 0);
            const existing = groups.get(rootPostId) || {
                rootPostId,
                posts: new Map<string, ReplyHistoryPost>(),
                latestActivity,
            };
            branchPosts.forEach(post => existing.posts.set(String(post.id), post));
            existing.latestActivity = Math.max(existing.latestActivity, latestActivity);
            groups.set(rootPostId, existing);
        }

        return [...groups.values()]
            .sort((left, right) => right.latestActivity - left.latestActivity || right.rootPostId - left.rootPostId)
            .map(group => ({
                rootPostId: group.rootPostId,
                posts: [...group.posts.values()].sort((left, right) => left.createdAt - right.createdAt || left.id - right.id),
            }));
    });
}

