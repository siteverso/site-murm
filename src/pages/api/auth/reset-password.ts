import type { APIRoute } from 'astro';
import { errorResponse } from '../../../lib/server/http';

export const POST: APIRoute = async () => {
    return errorResponse(new Error('RESET_DESABILITADO'));
};
