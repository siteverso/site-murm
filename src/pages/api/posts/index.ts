import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { createPost, listPosts } from '../../../lib/server/repositories/posts';

export const GET: APIRoute = async context => {
    try {
        const username = String(new URL(context.request.url).searchParams.get('username') || '').trim() || null;
        return json({ ok: true, posts: await listPosts(null, username) });
    } catch (error) {
        return errorResponse(error);
    }
};

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ text?: string }>(context.request);
        const text = String(input.text || '').trim();
        if (!text || text.length > 256) throw new Error('JSON_INVALIDO');
        const id = await createPost(user.id, text);
        return json({ ok: true, id }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
