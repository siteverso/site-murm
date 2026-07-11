import type { APIRoute } from 'astro';
import { errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { unreadDirects } from '../../../lib/server/repositories/directs';

export const GET: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        return json({ ok: true, ...await unreadDirects(user.id) });
    } catch (error) {
        return errorResponse(error);
    }
};
