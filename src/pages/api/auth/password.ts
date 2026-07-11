import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { hashPassword, validatePassword } from '../../../lib/server/security';
import { withConnection } from '../../../lib/server/oracle';

export const PATCH: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ password?: string; confirmPassword?: string }>(context.request);
        const password = String(input.password || '');
        validatePassword(password);
        if (password !== String(input.confirmPassword || '')) throw new Error('SENHAS_DIFERENTES');

        await withConnection(async connection => {
            await connection.execute(
                `UPDATE murm_user
                 SET password_hash = :password_hash,
                     password_changed_at = SYSTIMESTAMP,
                     updated_at = SYSTIMESTAMP
                 WHERE id = :id`,
                { password_hash: await hashPassword(password), id: user.id },
                { autoCommit: true },
            );
        });

        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
