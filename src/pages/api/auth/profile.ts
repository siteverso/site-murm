import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { normalizeUsername, validateUsername } from '../../../lib/server/security';
import { withConnection } from '../../../lib/server/oracle';

export const PATCH: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ username?: string; bio?: string }>(context.request);
        const username = normalizeUsername(input.username);
        const bio = String(input.bio || '').trim().slice(0, 180);
        validateUsername(username);

        await withConnection(async connection => {
            try {
                await connection.execute(
                    `UPDATE murm_user
                     SET username = :username,
                         bio = :bio,
                         updated_at = SYSTIMESTAMP
                     WHERE id = :id`,
                    { username, bio: bio || null, id: user.id },
                    { autoCommit: true },
                );
            } catch (error) {
                if (String(error).includes('ORA-00001')) throw new Error('CONTA_EXISTENTE');
                throw error;
            }
        });

        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
