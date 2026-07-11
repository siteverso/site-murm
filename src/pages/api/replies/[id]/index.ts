import type { APIRoute } from 'astro';
import { errorResponse, json } from '../../../../lib/server/http';
import { requireUser } from '../../../../lib/server/session';
import { deleteReply, restoreReply } from '../../../../lib/server/repositories/posts';

export const DELETE: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const replyId = Number(context.params.id);
        if (!Number.isInteger(replyId)) throw new Error('JSON_INVALIDO');
        await deleteReply(replyId, user.id);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};

export const PATCH: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const replyId = Number(context.params.id);
        if (!Number.isInteger(replyId)) throw new Error('JSON_INVALIDO');
        await restoreReply(replyId, user.id);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
