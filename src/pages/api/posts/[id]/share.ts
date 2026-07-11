import type { APIRoute } from 'astro';
import { errorResponse, json } from '../../../../lib/server/http';
import { requireUser } from '../../../../lib/server/session';
import { share } from '../../../../lib/server/repositories/posts';

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const postId = Number(context.params.id);
        if (!Number.isInteger(postId)) throw new Error('JSON_INVALIDO');
        await share(postId, user.id);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
