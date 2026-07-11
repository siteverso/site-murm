import type { APIContext } from 'astro';
import { createToken, hashToken } from './security';
import { withConnection } from './oracle';

export type SessionUser = {
    id: number;
    username: string;
    email: string;
    bio: string;
    sexCode: string;
    avatarUrl: string;
    languageCode: string;
    themeCode: string;
    hasPassword: boolean;
    hasGoogle: boolean;
    postCount: number;
    positiveCount: number;
    shareCount: number;
};

function cookieName(): string {
    return import.meta.env.SESSION_COOKIE_NAME || 'murmurinho_session';
}

function sessionDays(): number {
    return Math.max(1, Number(import.meta.env.SESSION_DAYS || 30));
}

export async function createSession(context: APIContext, userId: number, provider: 'password' | 'google', remember = true): Promise<void> {
    const token = createToken();
    const tokenHash = hashToken(token);
    const days = remember ? sessionDays() : 1;

    await withConnection(async connection => {
        await connection.execute(
            `INSERT INTO murm_session
             (
                 user_id,
                 token_hash,
                 provider,
                 expires_at,
                 ip_address,
                 user_agent
             )
             VALUES
             (
                 :user_id,
                 :token_hash,
                 :provider,
                 SYSTIMESTAMP + NUMTODSINTERVAL(:days, 'DAY'),
                 :ip_address,
                 :user_agent
             )`,
            {
                user_id: userId,
                token_hash: tokenHash,
                provider,
                days,
                ip_address: context.clientAddress || null,
                user_agent: context.request.headers.get('user-agent') || null,
            },
            { autoCommit: true },
        );
    });

    context.cookies.set(cookieName(), token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: context.url.protocol === 'https:',
        maxAge: remember ? days * 86400 : undefined,
    });
}

export async function revokeSession(context: APIContext): Promise<void> {
    const token = context.cookies.get(cookieName())?.value;

    if (token) {
        await withConnection(async connection => {
            await connection.execute(
                `UPDATE murm_session
                 SET revoked_at = SYSTIMESTAMP
                 WHERE token_hash = :token_hash
                   AND revoked_at IS NULL`,
                { token_hash: hashToken(token) },
                { autoCommit: true },
            );
        });
    }

    context.cookies.delete(cookieName(), { path: '/' });
}

export async function currentUser(context: APIContext): Promise<SessionUser | null> {
    const token = context.cookies.get(cookieName())?.value;

    if (!token) {
        return null;
    }

    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT u.id,
                    u.username,
                    u.email,
                    NVL(u.bio, '') AS bio,
                    NVL(u.sex_code, '') AS sex_code,
                    NVL(u.avatar_url, '') AS avatar_url,
                    u.language_code,
                    NVL(u.theme_code, 'auto') AS theme_code,
                    CASE WHEN u.password_hash IS NULL THEN 0 ELSE 1 END AS has_password,
                    CASE WHEN u.google_sub IS NULL THEN 0 ELSE 1 END AS has_google,
                    (SELECT COUNT(*) FROM murm_post p WHERE p.user_id = u.id AND p.parent_post_id IS NULL AND p.status = 'published') AS post_count,
                    (SELECT NVL(SUM(p.positive_count), 0) FROM murm_post p WHERE p.user_id = u.id AND p.parent_post_id IS NULL AND p.status = 'published') AS positive_count,
                    (SELECT NVL(SUM(p.share_count), 0) FROM murm_post p WHERE p.user_id = u.id AND p.parent_post_id IS NULL AND p.status = 'published') AS share_count
             FROM murm_session s
             JOIN murm_user u
               ON u.id = s.user_id
             WHERE s.token_hash = :token_hash
               AND s.revoked_at IS NULL
               AND s.expires_at > SYSTIMESTAMP
               AND u.active = 1`,
            { token_hash: hashToken(token) },
        );

        const row = result.rows?.[0];

        if (!row) {
            return null;
        }

        return {
            id: Number(row.ID),
            username: String(row.USERNAME),
            email: String(row.EMAIL),
            bio: String(row.BIO || ''),
            sexCode: String(row.SEX_CODE || ''),
            avatarUrl: String(row.AVATAR_URL || ''),
            languageCode: String(row.LANGUAGE_CODE || 'pt-BR'),
            themeCode: String(row.THEME_CODE || 'auto'),
            hasPassword: Number(row.HAS_PASSWORD) === 1,
            hasGoogle: Number(row.HAS_GOOGLE) === 1,
            postCount: Number(row.POST_COUNT || 0),
            positiveCount: Number(row.POSITIVE_COUNT || 0),
            shareCount: Number(row.SHARE_COUNT || 0),
        };
    });
}

export async function requireUser(context: APIContext): Promise<SessionUser> {
    const user = await currentUser(context);

    if (!user) {
        throw new Error('NAO_AUTENTICADO');
    }

    return user;
}
