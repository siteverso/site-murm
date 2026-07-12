// noinspection TypeScriptUnresolvedReference

import type {APIContext} from 'astro';
import {TEXT_LIMIT} from '../../../../lib/config/text';
import {errorResponse, json} from '../../../../lib/server/http';
import {deletePost, getPostBranch, updatePost} from '../../../../lib/server/repositories/posts';
import {requireUser} from '../../../../lib/server/session';

export async function GET(context: APIContext): Promise<Response> {
    try {
        const user = await requireUser(context);
        const postId = Number(context.params.id);

        if (!Number.isInteger(postId) || postId <= 0) {
            throw new Error('POST_NAO_ENCONTRADO');
        }

        return json({
            ok: true,
            posts: await getPostBranch(postId, user.id),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(context: APIContext): Promise<Response> {
    try {
        const user = await requireUser(context);
        const postId = Number(context.params.id);

        if (!Number.isInteger(postId) || postId <= 0) {
            throw new Error('POST_NAO_ENCONTRADO');
        }

        await deletePost(postId, user.id);
        return json({ok: true});
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PUT(context: APIContext): Promise<Response> {
    try {
        const user = await requireUser(context);
        const postId = Number(context.params.id);
        const input = await context.request.json() as {text?: unknown};
        const text = String(input.text || '').trim();

        if (!Number.isInteger(postId) || postId <= 0 || !text || text.length > TEXT_LIMIT) {
            throw new Error('JSON_INVALIDO');
        }

        await updatePost(postId, user.id, text);
        return json({ok: true});
    } catch (error) {
        return errorResponse(error);
    }
}
