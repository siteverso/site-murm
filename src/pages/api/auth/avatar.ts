import type { APIRoute } from 'astro';
import oracledb from 'oracledb';
import { errorResponse, json } from '../../../lib/server/http';
import { currentUser, requireUser } from '../../../lib/server/session';
import { withConnection } from '../../../lib/server/oracle';

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasValidSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
}

export const POST: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const formData = await context.request.formData();
        const avatar = formData.get('avatar');

        if (!(avatar instanceof File) || avatar.size < 1) throw new Error('AVATAR_INVALIDO');
        if (avatar.size > MAX_AVATAR_BYTES) throw new Error('AVATAR_MUITO_GRANDE');
        if (!ALLOWED_TYPES.has(avatar.type)) throw new Error('AVATAR_TIPO_INVALIDO');

        const avatarBuffer = Buffer.from(await avatar.arrayBuffer());
        if (!hasValidSignature(avatarBuffer, avatar.type)) throw new Error('AVATAR_TIPO_INVALIDO');

        await withConnection(async connection => {
            await connection.execute(
                `UPDATE murm_user
                 SET avatar_image = :avatar_image,
                     avatar_mime_type = :avatar_mime_type,
                     avatar_updated_at = SYSTIMESTAMP,
                     updated_at = SYSTIMESTAMP
                 WHERE id = :id`,
                {
                    avatar_image: { val: avatarBuffer, type: oracledb.BUFFER },
                    avatar_mime_type: avatar.type,
                    id: user.id,
                },
                { autoCommit: true },
            );
        });

        return json({ ok: true, user: await currentUser(context) });
    } catch (error) {
        return errorResponse(error);
    }
};
