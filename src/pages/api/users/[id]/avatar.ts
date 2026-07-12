import type { APIRoute } from 'astro';
import oracledb from 'oracledb';
import { withConnection } from '../../../../lib/server/oracle';

export const GET: APIRoute = async ({ params }) => {
    const userId = Number(params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) return new Response(null, { status: 404 });

    const image = await withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT avatar_image, avatar_mime_type
             FROM murm_user
             WHERE id = :id
               AND active = 1
               AND avatar_image IS NOT NULL`,
            { id: userId },
            { fetchInfo: { AVATAR_IMAGE: { type: oracledb.BUFFER } } },
        );
        return result.rows?.[0] || null;
    });

    if (!image || !Buffer.isBuffer(image.AVATAR_IMAGE)) return new Response(null, { status: 404 });

    return new Response(image.AVATAR_IMAGE as Buffer, {
        headers: {
            'Content-Type': String(image.AVATAR_MIME_TYPE || 'application/octet-stream'),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
};
