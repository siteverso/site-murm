import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { requireUser } from '../../../lib/server/session';
import { THEME_CODES, type ThemeCode } from '../../../lib/theme';
import { withConnection } from '../../../lib/server/oracle';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const PATCH: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ themeCode?: string }>(context.request);
        const themeCode = String(input.themeCode || '').trim().toLowerCase() as ThemeCode;
        if (!THEME_CODES.includes(themeCode)) throw new Error('JSON_INVALIDO');

        await withConnection(async connection => {
            await connection.execute(
                `UPDATE murm_user
                 SET theme_code = :theme_code,
                     updated_at = SYSTIMESTAMP
                 WHERE id = :id`,
                { theme_code: themeCode, id: user.id },
                { autoCommit: true },
            );
        });

        context.cookies.set('murmurinho-theme', themeCode, {
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            sameSite: 'lax',
            secure: import.meta.env.PROD,
        });

        return json({ ok: true, themeCode });
    } catch (error) {
        return errorResponse(error);
    }
};
