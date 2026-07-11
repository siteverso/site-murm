import type { APIRoute } from 'astro';
import { OAuth2Client } from 'google-auth-library';
import { body, errorResponse, json } from '../../../lib/server/http';
import { createSession } from '../../../lib/server/session';
import { createOrLinkGoogleUser } from '../../../lib/server/repositories/users';
import { normalizeEmail, normalizeUsername, validateEmail } from '../../../lib/server/security';

export const POST: APIRoute = async context => {
    try {
        const clientId = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID?.trim();
        if (!clientId) throw new Error('GOOGLE_INVALIDO');

        const input = await body<{ credential?: string }>(context.request);
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
            idToken: String(input.credential || ''),
            audience: clientId,
        });
        const payload = ticket.getPayload();
        const email = normalizeEmail(payload?.email);
        const googleSub = String(payload?.sub || '');

        validateEmail(email);
        if (!googleSub || payload?.email_verified !== true) throw new Error('GOOGLE_INVALIDO');

        const baseUsername = normalizeUsername(email.split('@')[0]).replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'usuario';
        const userId = await createOrLinkGoogleUser({
            googleSub,
            email,
            username: baseUsername,
            avatarUrl: String(payload?.picture || ''),
        });

        await createSession(context, userId, 'google', true);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
