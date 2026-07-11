import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../../lib/server/http';
import { requireUser } from '../../../../lib/server/session';
import { vote } from '../../../../lib/server/repositories/posts';

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const postId = Number(context.params.id);
        const input = await body<{ value?: number }>(context.request);
        const value = Number(input.value);
        if (!Number.isInteger(postId) || ![-1, 1].includes(value)) throw new Error('JSON_INVALIDO');
        await vote(postId, user.id, value as -1 | 1);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
