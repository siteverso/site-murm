import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { archiveConversation, deleteConversationForUser } from '../../../lib/server/repositories/directs';

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ otherUserId?: number; action?: string }>(context.request);
        const otherUserId = Number(input.otherUserId);
        const action = String(input.action || '');
        if (!Number.isInteger(otherUserId) || otherUserId <= 0 || !['archive', 'delete'].includes(action)) {
            throw new Error('DIRECT_INVALIDO');
        }

        if (action === 'archive') await archiveConversation(user.id, otherUserId);
        else await deleteConversationForUser(user.id, otherUserId);

        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
