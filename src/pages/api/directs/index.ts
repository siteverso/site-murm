import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { listConversations, listMessages, sendDirect } from '../../../lib/server/repositories/directs';

export const GET: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const otherUserId = Number(context.url.searchParams.get('otherUserId') || 0);
        const conversations = await listConversations(user.id);
        const messages = otherUserId ? await listMessages(user.id, otherUserId) : undefined;
        return json({ ok: true, conversations, messages });
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
        if (!Number.isInteger(recipientId) || !contents || contents.length > 1000) throw new Error('DIRECT_INVALIDO');
        const id = await sendDirect(user.id, recipientId, contents);
        return json({ ok: true, id }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
