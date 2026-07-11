import oracledb from 'oracledb';
import { withConnection } from '../oracle';

export type UserRow = {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    googleSub: string;
};

function map(row: Record<string, unknown> | undefined): UserRow | null {
    if (!row) return null;

    return {
        id: Number(row.ID),
        username: String(row.USERNAME),
        email: String(row.EMAIL),
        passwordHash: String(row.PASSWORD_HASH || ''),
        googleSub: String(row.GOOGLE_SUB || ''),
    };
}

export async function findByIdentifier(identifier: string): Promise<UserRow | null> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT id, username, email, password_hash, google_sub
             FROM murm_user
             WHERE active = 1
               AND (LOWER(username) = :identifier OR LOWER(email) = :identifier)`,
            { identifier },
        );
        return map(result.rows?.[0]);
    });
}

export async function findByGoogleSubOrEmail(googleSub: string, email: string): Promise<UserRow | null> {
    return withConnection(async connection => {
        const result = await connection.execute<Record<string, unknown>>(
            `SELECT id, username, email, password_hash, google_sub
             FROM murm_user
             WHERE active = 1
               AND (google_sub = :google_sub OR LOWER(email) = :email)`,
            { google_sub: googleSub, email },
        );
        return map(result.rows?.[0]);
    });
}

export async function createPasswordUser(username: string, email: string, passwordHash: string): Promise<number> {
    return withConnection(async connection => {
        try {
            const result = await connection.execute(
                `INSERT INTO murm_user
                 (
                     username,
                     email,
                     password_hash,
                     email_verified
                 )
                 VALUES
                 (
                     :username,
                     :email,
                     :password_hash,
                     0
                 )
                 RETURNING id INTO :id`,
                {
                    username,
                    email,
                    password_hash: passwordHash,
                    id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                },
                { autoCommit: true },
            );

            return Number((result.outBinds as { id: number[] }).id[0]);
        } catch (error) {
            if (String(error).includes('ORA-00001')) throw new Error('CONTA_EXISTENTE');
            throw error;
        }
    });
}

export async function createOrLinkGoogleUser(input: {
    googleSub: string;
    email: string;
    username: string;
    avatarUrl: string;
}): Promise<number> {
    const existing = await findByGoogleSubOrEmail(input.googleSub, input.email);

    if (existing) {
        await withConnection(async connection => {
            await connection.execute(
                `UPDATE murm_user
                 SET google_sub = NVL(google_sub, :google_sub),
                     avatar_url = CASE WHEN :avatar_url IS NULL THEN avatar_url ELSE :avatar_url END,
                     email_verified = 1,
                     updated_at = SYSTIMESTAMP
                 WHERE id = :id`,
                {
                    google_sub: input.googleSub,
                    avatar_url: input.avatarUrl || null,
                    id: existing.id,
                },
                { autoCommit: true },
            );
        });
        return existing.id;
    }

    return withConnection(async connection => {
        let username = input.username;
        let suffix = 0;

        while (true) {
            try {
                const result = await connection.execute(
                    `INSERT INTO murm_user
                     (
                         username,
                         email,
                         google_sub,
                         avatar_url,
                         email_verified
                     )
                     VALUES
                     (
                         :username,
                         :email,
                         :google_sub,
                         :avatar_url,
                         1
                     )
                     RETURNING id INTO :id`,
                    {
                        username,
                        email: input.email,
                        google_sub: input.googleSub,
                        avatar_url: input.avatarUrl || null,
                        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    },
                    { autoCommit: true },
                );
                return Number((result.outBinds as { id: number[] }).id[0]);
            } catch (error) {
                if (!String(error).includes('UK_MURM_USER_USERNAME') && !String(error).includes('ORA-00001')) throw error;
                suffix += 1;
                username = `${input.username.slice(0, Math.max(3, 30 - String(suffix).length))}${suffix}`;
            }
        }
    });
}
