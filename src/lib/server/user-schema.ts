import type { Connection } from 'oracledb';

type UserSchema = {
    avatarImage: boolean;
    avatarUpdatedAt: boolean;
    countryCode: boolean;
    countryName: boolean;
    countryCallingCode: boolean;
};

let cached: UserSchema | null = null;

export async function getUserSchema(connection: Connection): Promise<UserSchema> {
    if (cached) return cached;

    const result = await connection.execute<Record<string, unknown>>(
        `SELECT column_name
           FROM user_tab_columns
          WHERE table_name = 'MURM_USER'
            AND column_name IN ('AVATAR_IMAGE', 'AVATAR_UPDATED_AT', 'COUNTRY_CODE', 'COUNTRY_NAME', 'COUNTRY_CALLING_CODE')`,
    );
    const names = new Set((result.rows || []).map(row => String(row.COLUMN_NAME || '').toUpperCase()));
    cached = {
        avatarImage: names.has('AVATAR_IMAGE'),
        avatarUpdatedAt: names.has('AVATAR_UPDATED_AT'),
        countryCode: names.has('COUNTRY_CODE'),
        countryName: names.has('COUNTRY_NAME'),
        countryCallingCode: names.has('COUNTRY_CALLING_CODE'),
    };
    return cached;
}

export function avatarSql(schema: UserSchema, alias = 'u'): string {
    if (!schema.avatarImage) return `NVL(${alias}.avatar_url, '')`;
    const versionColumn = schema.avatarUpdatedAt
        ? `NVL(${alias}.avatar_updated_at, ${alias}.updated_at)`
        : `${alias}.updated_at`;
    return `CASE WHEN ${alias}.avatar_image IS NOT NULL THEN '/api/users/' || ${alias}.id || '/avatar?v=' || TO_CHAR(${versionColumn}, 'YYYYMMDDHH24MISSFF6') ELSE NVL(${alias}.avatar_url, '') END`;
}
