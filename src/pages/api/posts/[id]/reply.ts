import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../../lib/server/http';
import { requireUser } from '../../../../lib/server/session';
import { createPost } from '../../../../lib/server/repositories/posts';

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const postId = Number(context.params.id);
        const input = await body<{ text?: string }>(context.request);
        const text = String(input.text || '').trim();
        if (!Number.isInteger(postId) || !text || text.length > 280) throw new Error('JSON_INVALIDO');
        const id = await createPost(user.id, text, postId);
        return json({ ok: true, id }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
