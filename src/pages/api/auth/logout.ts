import type { APIRoute } from 'astro';
import { errorResponse, json } from '../../../lib/server/http';
import { revokeSession } from '../../../lib/server/session';

export const POST: APIRoute = async context => {
    try {
        await revokeSession(context);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
