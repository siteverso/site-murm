import oracledb from 'oracledb';
import { withConnection } from '../oracle';

export async function listConversations(userId: number): Promise<unknown[]> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT other_user_id,
                    username,
                    last_message,
                    last_at,
                    unread_count
               FROM vw_murm_direct_conversation
              WHERE user_id = :user_id
              ORDER BY last_at DESC`,
            { user_id: userId },
        );
        return (result.rows || []).map(row => ({
            otherUserId: Number(row.OTHER_USER_ID),
            username: String(row.USERNAME),
            lastMessage: String(row.LAST_MESSAGE),
            lastAt: new Date(String(row.LAST_AT)).getTime(),
            unreadCount: Number(row.UNREAD_COUNT || 0),
        }));
    });
}

export async function listMessages(userId: number, otherUserId: number): Promise<unknown[]> {
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
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT id,
                    sender_user_id,
                    recipient_user_id,
                    contents,
                    created_at,
                    sender_name
               FROM
                    (
                        SELECT d.id,
                               d.sender_user_id,
                               d.recipient_user_id,
                               d.contents,
                               d.created_at,
                               u.username AS sender_name
                          FROM murm_direct d
                          JOIN murm_user u
                            ON u.id = d.sender_user_id
                         WHERE (d.sender_user_id = :user_id AND d.recipient_user_id = :other_user_id)
                            OR (d.sender_user_id = :other_user_id AND d.recipient_user_id = :user_id)
                         ORDER BY d.created_at DESC
                         FETCH FIRST 100 ROWS ONLY
                    )
              ORDER BY created_at`,
            { user_id: userId, other_user_id: otherUserId },
        );
        return (result.rows || []).map(row => ({
            id: Number(row.ID),
            senderId: Number(row.SENDER_USER_ID),
            recipientId: Number(row.RECIPIENT_USER_ID),
            senderName: String(row.SENDER_NAME),
            contents: String(row.CONTENTS),
            createdAt: new Date(String(row.CREATED_AT)).getTime(),
        }));
    });
}

export async function sendDirect(senderId: number, recipientId: number, contents: string): Promise<number> {
    if (senderId === recipientId) throw new Error('DIRECT_INVALIDO');
    return withConnection(async connection => {
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


export async function deleteDirect(userId: number, directId: number): Promise<void> {
    await withConnection(async connection => {
        const result = await connection.execute(
            `DELETE FROM murm_direct
              WHERE id = :direct_id
                AND sender_user_id = :user_id`,
            { direct_id: directId, user_id: userId },
            { autoCommit: true },
        );
        if (!result.rowsAffected) throw new Error('DIRECT_NAO_ENCONTRADO');
    });
}
