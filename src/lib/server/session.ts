import type { APIContext } from 'astro';
import { createToken, hashToken } from './security';
import { withConnection } from './oracle';

export type SessionUser = {
    id: number;
    username: string;
    usernameSetAt: number | null;
    usernameChangeCount: number;
    usernameCanChange: boolean;
    usernameChangeAvailableAt: number | null;
    email: string;
    emailSetAt: number | null;
    emailCanChange: boolean;
    emailChangeAvailableAt: number | null;
    bio: string;
    sexCode: string;
    sexSetAt: number | null;
    sexChangeCount: number;
    sexCanChange: boolean;
    sexChangeAvailableAt: number | null;
    avatarUrl: string;
    languageCode: string;
    themeCode: string;
    regionCode: string;
    columnGroupCode: 'sex' | 'region';
    hasPassword: boolean;
    hasGoogle: boolean;
    postCount: number;
    positiveCount: number;
    negativeCount: number;
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
                    u.username_set_at,
                    NVL(u.username_change_count, 0) AS username_change_count,
                    u.email,
                    u.email_set_at,
                    NVL(u.bio, '') AS bio,
                    NVL(u.sex_code, '') AS sex_code,
                    u.sex_set_at,
                    NVL(u.sex_change_count, 0) AS sex_change_count,
                    CASE
                        WHEN u.avatar_image IS NOT NULL THEN
                            '/api/users/' || u.id || '/avatar?v=' ||
                            TO_CHAR(NVL(u.avatar_updated_at, u.updated_at), 'YYYYMMDDHH24MISSFF6')
                        ELSE NVL(u.avatar_url, '')
                    END AS avatar_url,
                    u.language_code,
                    NVL(u.theme_code, 'auto') AS theme_code,
                    NVL(u.region_code, '') AS region_code,
                    NVL(u.column_group_code, 'sex') AS column_group_code,
                    CASE WHEN u.password_hash IS NULL THEN 0 ELSE 1 END AS has_password,
                    CASE WHEN u.google_sub IS NULL THEN 0 ELSE 1 END AS has_google,
                    (SELECT COUNT(*) FROM murm_post p WHERE p.user_id = u.id AND p.parent_post_id IS NULL AND p.status = 'published'
                       AND NVL(LOWER(TRIM(p.post_type)), 'text') <> 'photo') AS post_count,
                    (SELECT NVL(SUM(p.positive_count), 0) FROM murm_post p WHERE p.user_id = u.id AND p.parent_post_id IS NULL AND p.status = 'published'
                       AND NVL(LOWER(TRIM(p.post_type)), 'text') <> 'photo') AS positive_count,
                    (SELECT NVL(SUM(p.negative_count), 0) FROM murm_post p WHERE p.user_id = u.id AND p.parent_post_id IS NULL AND p.status = 'published'
                       AND NVL(LOWER(TRIM(p.post_type)), 'text') <> 'photo') AS negative_count
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

        const usernameSetAt = row.USERNAME_SET_AT ? new Date(String(row.USERNAME_SET_AT)).getTime() : null;
        const usernameChangeCount = Number(row.USERNAME_CHANGE_COUNT || 0);
        const usernameChangeAvailableAt = usernameSetAt ? usernameSetAt + (30 * 24 * 60 * 60 * 1000) : null;
        const usernameCanChange = usernameChangeCount < 1 && Boolean(usernameChangeAvailableAt && Date.now() >= usernameChangeAvailableAt);
        const emailSetAt = row.EMAIL_SET_AT ? new Date(String(row.EMAIL_SET_AT)).getTime() : null;
        const emailChangeAvailableAt = emailSetAt ? emailSetAt + (30 * 24 * 60 * 60 * 1000) : null;
        const emailCanChange = Boolean(emailChangeAvailableAt && Date.now() >= emailChangeAvailableAt);

        const sexCode = String(row.SEX_CODE || '');
        const sexSetAt = row.SEX_SET_AT ? new Date(String(row.SEX_SET_AT)).getTime() : null;
        const sexChangeCount = Number(row.SEX_CHANGE_COUNT || 0);
        const sexChangeAvailableAt = sexSetAt ? sexSetAt + (30 * 24 * 60 * 60 * 1000) : null;
        const sexCanChange = !sexCode || (sexChangeCount < 1 && Boolean(sexChangeAvailableAt && Date.now() >= sexChangeAvailableAt));

        return {
            id: Number(row.ID),
            username: String(row.USERNAME),
            usernameSetAt,
            usernameChangeCount,
            usernameCanChange,
            usernameChangeAvailableAt,
            email: String(row.EMAIL),
            emailSetAt,
            emailCanChange,
            emailChangeAvailableAt,
            bio: String(row.BIO || ''),
            sexCode,
            sexSetAt,
            sexChangeCount,
            sexCanChange,
            sexChangeAvailableAt,
            avatarUrl: String(row.AVATAR_URL || ''),
            languageCode: String(row.LANGUAGE_CODE || 'pt-BR'),
            themeCode: String(row.THEME_CODE || 'auto'),
            regionCode: String(row.REGION_CODE || ''),
            columnGroupCode: String(row.COLUMN_GROUP_CODE || 'sex') === 'region' ? 'region' : 'sex',
            hasPassword: Number(row.HAS_PASSWORD) === 1,
            hasGoogle: Number(row.HAS_GOOGLE) === 1,
            postCount: Number(row.POST_COUNT || 0),
            positiveCount: Number(row.POSITIVE_COUNT || 0),
            negativeCount: Number(row.NEGATIVE_COUNT || 0),
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
