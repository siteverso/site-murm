import oracledb from 'oracledb';
import { withConnection } from '../oracle';

const DIRECT_SEND_INTERVAL_MS = 2000;
const lastDirectSentAtByUser = new Map<number, number>();

export async function listConversations(userId: number): Promise<unknown[]> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT c.other_user_id,
                    c.username,
                    c.last_message,
                    c.last_at,
                    c.unread_count,
                    NVL(u.sex_code, '') AS sex_code
               FROM vw_murm_direct_conversation c
               JOIN murm_user u
                 ON u.id = c.other_user_id
              WHERE c.user_id = :user_id
              ORDER BY c.last_at DESC`,
            { user_id: userId },
        );
        return (result.rows || []).map(row => ({
            otherUserId: Number(row.OTHER_USER_ID),
            username: String(row.USERNAME),
            lastMessage: String(row.LAST_MESSAGE),
            lastAt: new Date(String(row.LAST_AT)).getTime(),
            unreadCount: Number(row.UNREAD_COUNT || 0),
            sexCode: String(row.SEX_CODE || ''),
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
                    u.username AS sender_name,
                    NVL(u.sex_code, '') AS sender_sex_code
               FROM murm_direct d
               JOIN murm_user u
                 ON u.id = d.sender_user_id
              WHERE ((d.sender_user_id = :user_id AND d.recipient_user_id = :other_user_id)
                 OR  (d.sender_user_id = :other_user_id AND d.recipient_user_id = :user_id))
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
            { autoCommit: true },
        );
            return Number((result.outBinds as { id: number[] }).id[0]);
        });
    } catch (error) {
        if (lastDirectSentAtByUser.get(senderId) === now) {
            lastDirectSentAtByUser.delete(senderId);
        }
        throw error;
    }
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
