import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { createSession } from '../../../lib/server/session';
import { createPasswordUser } from '../../../lib/server/repositories/users';
import { hashPassword, normalizeEmail, normalizeUsername, validateEmail, validatePassword, validateUsername } from '../../../lib/server/security';

export const POST: APIRoute = async context => {
    try {
        const input = await body<{ username?: string; email?: string; password?: string; confirmPassword?: string }>(context.request);
        const username = normalizeUsername(input.username);
        const email = normalizeEmail(input.email);
        const password = String(input.password || '');

        validateUsername(username);
        validateEmail(email);
        validatePassword(password);
        if (password !== String(input.confirmPassword || '')) throw new Error('SENHAS_DIFERENTES');

        const userId = await createPasswordUser(username, email, await hashPassword(password));
        await createSession(context, userId, 'password', true);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
