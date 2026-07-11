import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { deleteDirect, listConversations, listMessages, sendDirect } from '../../../lib/server/repositories/directs';

export const GET: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const otherUserId = Number(context.url.searchParams.get('otherUserId') || 0);
        const conversations = await listConversations(user.id);
        const beforeId = Number(context.url.searchParams.get('beforeId') || 0);
        const limit = Math.min(50, Math.max(1, Number(context.url.searchParams.get('limit') || 20)));
        const messagePage = otherUserId ? await listMessages(user.id, otherUserId, { beforeId, limit }) : undefined;
        return json({ ok: true, conversations, messages: messagePage?.messages, hasMore: messagePage?.hasMore });
    } catch (error) {
        return errorResponse(error);
    }
};

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ recipientId?: number; contents?: string }>(context.request);
        const recipientId = Number(input.recipientId);
        const contents = String(input.contents || '').trim();
        if (!Number.isInteger(recipientId) || !contents || contents.length > 256) throw new Error('DIRECT_INVALIDO');
        const id = await sendDirect(user.id, recipientId, contents);
        return json({ ok: true, id }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};


export const DELETE: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const messageId = Number(context.url.searchParams.get('messageId') || 0);
        if (!Number.isInteger(messageId) || messageId <= 0) throw new Error('DIRECT_INVALIDO');
        await deleteDirect(messageId, user.id);
        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
