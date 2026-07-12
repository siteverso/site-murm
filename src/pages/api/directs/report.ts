import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { reportDirectConversation } from '../../../lib/server/repositories/directs';

const ALLOWED_REASONS = new Set(['Assédio', 'Spam', 'Ameaça', 'Conteúdo impróprio', 'Outro']);

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ reportedUserId?: number; reason?: string; details?: string }>(context.request);
        const reportedUserId = Number(input.reportedUserId);
        const reason = String(input.reason || '').trim();
        const details = String(input.details || '').trim();

        if (!Number.isInteger(reportedUserId) || reportedUserId <= 0 || !ALLOWED_REASONS.has(reason) || details.length > 600) {
            throw new Error('DIRECT_INVALIDO');
        }

        await reportDirectConversation(user.id, reportedUserId, reason, details);
        return json({ ok: true }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
