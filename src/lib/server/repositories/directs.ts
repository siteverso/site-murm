import oracledb from 'oracledb';
import { withConnection } from '../oracle';

const DIRECT_SEND_INTERVAL_MS = 2000;
const lastDirectSentAtByUser = new Map<number, number>();

export async function listConversations(userId: number, archived = false): Promise<unknown[]> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `WITH participant_messages AS
             (
                 SELECT d.sender_user_id AS user_id,
                        d.recipient_user_id AS other_user_id,
                        d.id,
                        d.contents,
                        d.created_at,
                        0 AS unread
                   FROM murm_direct d
                 UNION ALL
                 SELECT d.recipient_user_id AS user_id,
                        d.sender_user_id AS other_user_id,
                        d.id,
                        d.contents,
                        d.created_at,
                        CASE WHEN d.read_at IS NULL THEN 1 ELSE 0 END AS unread
                   FROM murm_direct d
             ), visible_messages AS
             (
                 SELECT p.*
                   FROM participant_messages p
                   LEFT JOIN murm_direct_user_state s
                     ON s.user_id = p.user_id
                    AND s.other_user_id = p.other_user_id
                  WHERE p.user_id = :user_id
                    AND p.id > NVL(s.deleted_before_id, 0)
                    AND
                    (
                        (:archived = 0 AND (s.archived_at IS NULL OR p.created_at > s.archived_at))
                        OR
                        (:archived = 1 AND s.archived_at IS NOT NULL AND p.created_at <= s.archived_at)
                    )
             ), ranked AS
             (
                 SELECT p.*,
                        ROW_NUMBER() OVER
                        (
                            PARTITION BY p.user_id, p.other_user_id
                            ORDER BY p.created_at DESC, p.id DESC
                        ) AS rn,
                        SUM(p.unread) OVER
                        (
                            PARTITION BY p.user_id, p.other_user_id
                        ) AS unread_count
                   FROM visible_messages p
             )
             SELECT r.other_user_id,
                    u.username,
                    r.contents AS last_message,
                    r.created_at AS last_at,
                    r.unread_count,
                    NVL(u.sex_code, '') AS sex_code,
                    CASE WHEN EXISTS
                    (
                        SELECT 1
                          FROM murm_user_block b
                         WHERE b.blocker_user_id = :user_id
                           AND b.blocked_user_id = r.other_user_id
                    ) THEN 1 ELSE 0 END AS blocked_by_me,
                    CASE WHEN EXISTS
                    (
                        SELECT 1
                          FROM murm_user_block b
                         WHERE (b.blocker_user_id = :user_id AND b.blocked_user_id = r.other_user_id)
                            OR (b.blocker_user_id = r.other_user_id AND b.blocked_user_id = :user_id)
                    ) THEN 1 ELSE 0 END AS blocked_either
               FROM ranked r
               JOIN murm_user u
                 ON u.id = r.other_user_id
              WHERE r.rn = 1
              ORDER BY r.created_at DESC`,
            { user_id: userId, archived: archived ? 1 : 0 },
        );
        return (result.rows || []).map(row => ({
            otherUserId: Number(row.OTHER_USER_ID),
            username: String(row.USERNAME),
            lastMessage: String(row.LAST_MESSAGE),
            lastAt: new Date(String(row.LAST_AT)).getTime(),
            unreadCount: Number(row.UNREAD_COUNT || 0),
            sexCode: String(row.SEX_CODE || ''),
            blockedByMe: Number(row.BLOCKED_BY_ME || 0) === 1,
            blockedEither: Number(row.BLOCKED_EITHER || 0) === 1,
        }));
    });
}

export async function listMessages(
    userId: number,
    otherUserId: number,
    options: { beforeId?: number; limit?: number } = {},
): Promise<{ messages: unknown[]; hasMore: boolean }> {
    return withConnection(async connection => {
        await connection.execute(
            `UPDATE murm_direct
                SET read_at = SYSTIMESTAMP
              WHERE recipient_user_id = :user_id
                AND sender_user_id = :other_user_id
                AND read_at IS NULL`,
            { user_id: userId, other_user_id: otherUserId },
            { autoCommit: true },
        );

        const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
        const beforeId = Number(options.beforeId || 0);
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT d.id,
                    d.sender_user_id,
                    d.recipient_user_id,
                    d.contents,
                    d.created_at,
                    d.updated_at,
                    u.username AS sender_name,
                    NVL(u.sex_code, '') AS sender_sex_code
               FROM murm_direct d
               JOIN murm_user u
                 ON u.id = d.sender_user_id
              WHERE ((d.sender_user_id = :user_id AND d.recipient_user_id = :other_user_id)
                 OR  (d.sender_user_id = :other_user_id AND d.recipient_user_id = :user_id))
                AND d.id > NVL
                (
                    (SELECT s.deleted_before_id
                       FROM murm_direct_user_state s
                      WHERE s.user_id = :user_id
                        AND s.other_user_id = :other_user_id),
                    0
                )
                AND (:before_id = 0 OR d.id < :before_id)
              ORDER BY d.id DESC
              FETCH FIRST :fetch_limit ROWS ONLY`,
            {
                user_id: userId,
                other_user_id: otherUserId,
                before_id: beforeId,
                fetch_limit: limit + 1,
            },
        );

        const rows = result.rows || [];
        const hasMore = rows.length > limit;
        const pageRows = rows.slice(0, limit).reverse();
        const messages = pageRows.map(row => ({
            id: Number(row.ID),
            senderId: Number(row.SENDER_USER_ID),
            recipientId: Number(row.RECIPIENT_USER_ID),
            senderName: String(row.SENDER_NAME),
            senderSexCode: String(row.SENDER_SEX_CODE || ''),
            contents: String(row.CONTENTS),
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
            updatedAt: new Date(String(row.UPDATED_AT || row.CREATED_AT)).getTime(),
        }));

        return { messages, hasMore };
    });
}

export async function sendDirect(senderId: number, recipientId: number, contents: string): Promise<number> {
    if (senderId === recipientId) throw new Error('DIRECT_INVALIDO');

    const now = Date.now();
    const lastSentAt = lastDirectSentAtByUser.get(senderId) || 0;
    if (now - lastSentAt < DIRECT_SEND_INTERVAL_MS) throw new Error('DIRECT_AGUARDE');
    lastDirectSentAtByUser.set(senderId, now);

    try {
        return await withConnection(async connection => {
            const recipient = await connection.execute<Record<string, unknown>>(
            `SELECT id
               FROM murm_user
              WHERE id = :recipient_user_id
                AND active = 1`,
            { recipient_user_id: recipientId },
        );
        if (!recipient.rows?.[0]) throw new Error('DIRECT_INVALIDO');

        const block = await connection.execute<Record<string, unknown>>(
            `SELECT 1 AS blocked
               FROM murm_user_block
              WHERE (blocker_user_id = :sender_user_id AND blocked_user_id = :recipient_user_id)
                 OR (blocker_user_id = :recipient_user_id AND blocked_user_id = :sender_user_id)
              FETCH FIRST 1 ROW ONLY`,
            { sender_user_id: senderId, recipient_user_id: recipientId },
        );
        if (block.rows?.[0]) throw new Error('DIRECT_BLOQUEADO');

        const result = await connection.execute(
            `INSERT INTO murm_direct
             (
                 sender_user_id,
                 recipient_user_id,
                 contents
             )
             VALUES
             (
                 :sender_user_id,
                 :recipient_user_id,
                 :contents
             )
             RETURNING id INTO :id`,
            {
                sender_user_id: senderId,
                recipient_user_id: recipientId,
                contents,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            },
            { autoCommit: false },
        );

            await connection.execute(
                `UPDATE murm_direct_user_state
                    SET archived_at = NULL,
                        updated_at = SYSTIMESTAMP
                  WHERE (user_id = :sender_user_id AND other_user_id = :recipient_user_id)
                     OR (user_id = :recipient_user_id AND other_user_id = :sender_user_id)`,
                { sender_user_id: senderId, recipient_user_id: recipientId },
            );
            await connection.commit();
            return Number((result.outBinds as { id: number[] }).id[0]);
        });
    } catch (error) {
        if (lastDirectSentAtByUser.get(senderId) === now) {
            lastDirectSentAtByUser.delete(senderId);
        }
        throw error;
    }
}


export async function updateDirect(messageId: number, userId: number, contents: string): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `UPDATE murm_direct
                SET contents = :contents,
                    updated_at = SYSTIMESTAMP
              WHERE id = :message_id
                AND sender_user_id = :user_id`,
            { contents, message_id: messageId, user_id: userId },
            { autoCommit: true },
        );

        if (!result.rowsAffected) throw new Error('DIRECT_NAO_ENCONTRADO');
    });
}

export async function deleteDirect(messageId: number, userId: number): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `DELETE FROM murm_direct
              WHERE id = :message_id
                AND sender_user_id = :user_id`,
            { message_id: messageId, user_id: userId },
            { autoCommit: true },
        );

        if (!result.rowsAffected) throw new Error('DIRECT_NAO_ENCONTRADO');
    });
}

export async function unreadDirects(userId: number): Promise<{ count: number; latestId: number }> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT COUNT(*) AS unread_count,
                    NVL(MAX(id), 0) AS latest_id
               FROM murm_direct
              WHERE recipient_user_id = :user_id
                AND read_at IS NULL`,
            { user_id: userId },
        );
        const row = result.rows?.[0];
        return { count: Number(row?.UNREAD_COUNT || 0), latestId: Number(row?.LATEST_ID || 0) };
    });
}

export async function reportDirectConversation(
    reporterUserId: number,
    reportedUserId: number,
    reason: string,
    details: string,
): Promise<void> {
    if (reporterUserId === reportedUserId) throw new Error('DIRECT_INVALIDO');

    await withConnection(async connection => {
        const users = await connection.execute<Record<string, unknown>>(
            `SELECT id, username
               FROM murm_user
              WHERE active = 1
                AND (id IN (:reporter_user_id, :reported_user_id)
                 OR LOWER(username) = 'murmurinho')`,
            { reporter_user_id: reporterUserId, reported_user_id: reportedUserId },
        );

        const rows = users.rows || [];
        const reporter = rows.find(row => Number(row.ID) === reporterUserId);
        const reported = rows.find(row => Number(row.ID) === reportedUserId);
        const moderator = rows.find(row => String(row.USERNAME || '').toLowerCase() === 'murmurinho');
        if (!reporter || !reported || !moderator || Number(moderator.ID) === reporterUserId) {
            throw new Error('DIRECT_INVALIDO');
        }

        const detailLine = details ? `\nDetalhes: ${details}` : '';
        const contents = [
            'DENÚNCIA DE CONVERSA',
            `Denunciante: @${String(reporter.USERNAME)}`,
            `Usuário denunciado: @${String(reported.USERNAME)}`,
            `Motivo: ${reason}${detailLine}`,
        ].join('\n');

        await connection.execute(
            `INSERT INTO murm_direct (sender_user_id, recipient_user_id, contents)
             VALUES (:sender_user_id, :recipient_user_id, :contents)`,
            {
                sender_user_id: reporterUserId,
                recipient_user_id: Number(moderator.ID),
                contents,
            },
            { autoCommit: true },
        );
    });
}


async function assertConversationUser(connection: oracledb.Connection, userId: number, otherUserId: number): Promise<void> {
    if (userId === otherUserId) throw new Error('DIRECT_INVALIDO');
    const result = await connection.execute<Record<string, unknown>>(
        `SELECT id
           FROM murm_user
          WHERE id = :other_user_id
            AND active = 1`,
        { other_user_id: otherUserId },
    );
    if (!result.rows?.[0]) throw new Error('DIRECT_INVALIDO');
}

export async function archiveConversation(userId: number, otherUserId: number): Promise<void> {
    await withConnection(async connection => {
        await assertConversationUser(connection, userId, otherUserId);
        await connection.execute(
            `MERGE INTO murm_direct_user_state target
             USING (SELECT :user_id AS user_id, :other_user_id AS other_user_id FROM dual) source
                ON (target.user_id = source.user_id AND target.other_user_id = source.other_user_id)
             WHEN MATCHED THEN UPDATE
                  SET target.archived_at = SYSTIMESTAMP,
                      target.updated_at = SYSTIMESTAMP
             WHEN NOT MATCHED THEN INSERT
                  (user_id, other_user_id, archived_at, deleted_before_id, updated_at)
                  VALUES (source.user_id, source.other_user_id, SYSTIMESTAMP, 0, SYSTIMESTAMP)`,
            { user_id: userId, other_user_id: otherUserId },
            { autoCommit: true },
        );
    });
}


export async function restoreConversation(userId: number, otherUserId: number): Promise<void> {
    await withConnection(async connection => {
        await assertConversationUser(connection, userId, otherUserId);
        await connection.execute(
            `UPDATE murm_direct_user_state
                SET archived_at = NULL,
                    updated_at = SYSTIMESTAMP
              WHERE user_id = :user_id
                AND other_user_id = :other_user_id`,
            { user_id: userId, other_user_id: otherUserId },
            { autoCommit: true },
        );
    });
}

export async function deleteConversationForUser(userId: number, otherUserId: number): Promise<void> {
    await withConnection(async connection => {
        await assertConversationUser(connection, userId, otherUserId);
        await connection.execute(
            `MERGE INTO murm_direct_user_state target
             USING
             (
                 SELECT :user_id AS user_id,
                        :other_user_id AS other_user_id,
                        NVL(MAX(d.id), 0) AS deleted_before_id
                   FROM murm_direct d
                  WHERE (d.sender_user_id = :user_id AND d.recipient_user_id = :other_user_id)
                     OR (d.sender_user_id = :other_user_id AND d.recipient_user_id = :user_id)
             ) source
                ON (target.user_id = source.user_id AND target.other_user_id = source.other_user_id)
             WHEN MATCHED THEN UPDATE
                  SET target.deleted_before_id = GREATEST(target.deleted_before_id, source.deleted_before_id),
                      target.archived_at = NULL,
                      target.updated_at = SYSTIMESTAMP
             WHEN NOT MATCHED THEN INSERT
                  (user_id, other_user_id, archived_at, deleted_before_id, updated_at)
                  VALUES (source.user_id, source.other_user_id, NULL, source.deleted_before_id, SYSTIMESTAMP)`,
            { user_id: userId, other_user_id: otherUserId },
            { autoCommit: true },
        );
    });
}

export async function blockUser(userId: number, otherUserId: number): Promise<void> {
    await withConnection(async connection => {
        await assertConversationUser(connection, userId, otherUserId);
        await connection.execute(
            `MERGE INTO murm_user_block target
             USING (SELECT :user_id AS blocker_user_id, :other_user_id AS blocked_user_id FROM dual) source
                ON (target.blocker_user_id = source.blocker_user_id AND target.blocked_user_id = source.blocked_user_id)
             WHEN NOT MATCHED THEN INSERT
                  (blocker_user_id, blocked_user_id, created_at)
                  VALUES (source.blocker_user_id, source.blocked_user_id, SYSTIMESTAMP)`,
            { user_id: userId, other_user_id: otherUserId },
            { autoCommit: true },
        );
    });
}

export async function unblockUser(userId: number, otherUserId: number): Promise<void> {
    await withConnection(async connection => {
        await connection.execute(
            `DELETE FROM murm_user_block
              WHERE blocker_user_id = :user_id
                AND blocked_user_id = :other_user_id`,
            { user_id: userId, other_user_id: otherUserId },
            { autoCommit: true },
        );
    });
}
