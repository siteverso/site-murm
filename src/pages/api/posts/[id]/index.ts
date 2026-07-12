// noinspection TypeScriptUnresolvedReference

import type {APIContext} from 'astro';
import {errorResponse, json} from '../../../../lib/server/http';
import {deletePost, getPostBranch} from '../../../../lib/server/repositories/posts';
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