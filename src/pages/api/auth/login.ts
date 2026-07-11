import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { createSession } from '../../../lib/server/session';
import { findByIdentifier } from '../../../lib/server/repositories/users';
import { comparePassword } from '../../../lib/server/security';

export const POST: APIRoute = async context => {
    try {
        const input = await body<{ identifier?: string; password?: string; remember?: boolean }>(context.request);
        const identifier = String(input.identifier || '').trim().toLowerCase();
        const password = String(input.password || '');
        const user = await findByIdentifier(identifier);

        if (!user?.passwordHash || !await comparePassword(password, user.passwordHash)) {
            throw new Error('LOGIN_INVALIDO');
        }

        await createSession(context, user.id, 'password', input.remember !== false);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
