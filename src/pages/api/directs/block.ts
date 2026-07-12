import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { blockUser, unblockUser } from '../../../lib/server/repositories/directs';

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ otherUserId?: number }>(context.request);
        const otherUserId = Number(input.otherUserId);
        if (!Number.isInteger(otherUserId) || otherUserId <= 0) throw new Error('DIRECT_INVALIDO');
        await blockUser(user.id, otherUserId);
        return json({ ok: true }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};

export const DELETE: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const otherUserId = Number(context.url.searchParams.get('otherUserId') || 0);
        if (!Number.isInteger(otherUserId) || otherUserId <= 0) throw new Error('DIRECT_INVALIDO');
        await unblockUser(user.id, otherUserId);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
