import type {APIContext} from 'astro';
import {TEXT_LIMIT} from '../../../lib/config/text';
import {body, errorResponse, json} from '../../../lib/server/http';
import {currentUser, requireUser} from '../../../lib/server/session';
import {
    createPost,
    listPosts,
    listSpecificThread,
} from '../../../lib/server/repositories/posts';

export async function GET(context: APIContext): Promise<Response> {
    try {
        const url = new URL(context.request.url);

        const username =
            String(url.searchParams.get('username') || '').trim() || null;

        const user = await currentUser(context);

        const specificId = Number(
            url.searchParams.get('specificId') || 0,
        );

        if (Number.isInteger(specificId) && specificId > 0) {
            const data = await listSpecificThread(
                specificId,
                user?.id || null,
            );

            return json({
                ok: true,
                ...data,
            });
        }

        const posts = await listPosts(
            user?.id || null,
            username,
            user?.preferredLanguageCode || null,
        );

        return json({
            ok: true,
            posts,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(context: APIContext): Promise<Response> {
    try {
        const user = await requireUser(context);

        const input = await body<{ text?: string }>(
            context.request,
        );

        const text = String(input.text || '').trim();

        if (!text || text.length > TEXT_LIMIT) {
            throw new Error('JSON_INVALIDO');
        }

        const id = await createPost(user.id, text);

        return json(
            {
                ok: true,
                id,
            },
            201,
        );
    } catch (error) {
        return errorResponse(error);
    }
}