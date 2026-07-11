import type { APIRoute } from 'astro';
import { errorResponse, json } from '../../../lib/server/http';
import { currentUser } from '../../../lib/server/session';

export const GET: APIRoute = async context => {
    try {
        const user = await currentUser(context);
        return user ? json({ ok: true, user }) : json({ ok: false, user: null }, 401);
    } catch (error) {
        return errorResponse(error);
    }
};
