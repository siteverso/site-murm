// noinspection ExceptionCaughtLocallyJS

import type { APIRoute } from 'astro';
import { body, errorResponse, json } from '../../../lib/server/http';
import { currentUser, requireUser } from '../../../lib/server/session';
import { normalizeEmail, normalizeUsername, validateEmail, validateUsername } from '../../../lib/server/security';
import { withConnection } from '../../../lib/server/oracle';

export const PATCH: APIRoute = async context => {
    try {
        const user = await requireUser(context);
        const input = await body<{ username?: string; email?: string; bio?: string; sexCode?: string; regionCode?: string; columnGroupCode?: string }>(context.request);
        const username = normalizeUsername(input.username);
        const email = normalizeEmail(input.email);
        const bio = String(input.bio || '').trim().slice(0, 180);
        const sexCode = String(input.sexCode || '').trim().toUpperCase();
        const regionCode = String(input.regionCode || '').trim().toUpperCase();
        const columnGroupCode = String(input.columnGroupCode || 'sex').trim().toLowerCase();
        validateUsername(username);
        validateEmail(email);
        if (sexCode && !['M', 'F'].includes(sexCode)) throw new Error('JSON_INVALIDO');
        if (regionCode && !['N', 'NE', 'CO', 'SE', 'S'].includes(regionCode)) throw new Error('JSON_INVALIDO');
        if (!['sex', 'region'].includes(columnGroupCode)) throw new Error('JSON_INVALIDO');

        await withConnection(async connection => {
            try {
                const currentResult = await connection.execute<Record<string, unknown>>(
                    `SELECT username,
                            username_set_at,
                            NVL(username_change_count, 0) AS username_change_count,
                            email,
                            email_set_at,
                            sex_code,
                            sex_set_at,
                            NVL(sex_change_count, 0) AS sex_change_count
                     FROM murm_user
                     WHERE id = :id
                     FOR UPDATE`,
                    { id: user.id },
                );

                const current = currentResult.rows?.[0];
                if (!current) throw new Error('NAO_AUTENTICADO');

                const currentUsername = String(current.USERNAME || '');
                const usernameSetAt = current.USERNAME_SET_AT ? new Date(String(current.USERNAME_SET_AT)).getTime() : null;
                const usernameChangeCount = Number(current.USERNAME_CHANGE_COUNT || 0);
                const usernameChanged = username !== currentUsername;

                if (usernameChanged) {
                    if (usernameChangeCount >= 1) throw new Error('USUARIO_ALTERACAO_ESGOTADA');
                    if (!usernameSetAt || Date.now() < usernameSetAt + (30 * 24 * 60 * 60 * 1000)) {
                        throw new Error('USUARIO_AGUARDE_30_DIAS');
                    }
                }

                const currentEmail = String(current.EMAIL || '');
                const emailSetAt = current.EMAIL_SET_AT ? new Date(String(current.EMAIL_SET_AT)).getTime() : null;
                const emailChanged = email !== currentEmail;

                if (emailChanged && (!emailSetAt || Date.now() < emailSetAt + (30 * 24 * 60 * 60 * 1000))) {
                    throw new Error('EMAIL_AGUARDE_30_DIAS');
                }

                const currentSexCode = String(current.SEX_CODE || '');
                const sexChangeCount = Number(current.SEX_CHANGE_COUNT || 0);
                const sexSetAt = current.SEX_SET_AT ? new Date(String(current.SEX_SET_AT)).getTime() : null;
                const sexChanged = sexCode !== currentSexCode;

                if (sexChanged && currentSexCode) {
                    if (!sexCode) throw new Error('SEXO_NAO_PODE_REMOVER');
                    if (sexChangeCount >= 1) throw new Error('SEXO_ALTERACAO_ESGOTADA');
                    if (!sexSetAt || Date.now() < sexSetAt + (30 * 24 * 60 * 60 * 1000)) {
                        throw new Error('SEXO_AGUARDE_30_DIAS');
                    }
                }

                await connection.execute(
                    `UPDATE murm_user
                     SET username = CASE
                             WHEN :username_changed = 1 THEN :username
                             ELSE username
                         END,
                         username_set_at = CASE
                             WHEN :username_changed = 1 THEN SYSTIMESTAMP
                             ELSE username_set_at
                         END,
                         username_change_count = CASE
                             WHEN :username_changed = 1 THEN 1
                             ELSE username_change_count
                         END,
                         email = CASE
                             WHEN :email_changed = 1 THEN :email
                             ELSE email
                         END,
                         email_set_at = CASE
                             WHEN :email_changed = 1 THEN SYSTIMESTAMP
                             ELSE email_set_at
                         END,
                         bio = :bio,
                         region_code = :region_code,
                         column_group_code = :column_group_code,
                         sex_code = CASE
                             WHEN :sex_changed = 1 THEN :sex_code
                             ELSE sex_code
                         END,
                         sex_set_at = CASE
                             WHEN :sex_changed = 1 THEN SYSTIMESTAMP
                             ELSE sex_set_at
                         END,
                         sex_change_count = CASE
                             WHEN :sex_changed = 1 AND sex_code IS NOT NULL THEN 1
                             ELSE sex_change_count
                         END,
                         updated_at = SYSTIMESTAMP
                     WHERE id = :id`,
                    {
                        username,
                        username_changed: usernameChanged ? 1 : 0,
                        email,
                        email_changed: emailChanged ? 1 : 0,
                        bio: bio || null,
                        region_code: regionCode || null,
                        column_group_code: columnGroupCode,
                        sex_code: sexCode || null,
                        sex_changed: sexChanged ? 1 : 0,
                        id: user.id,
                    },
                );

                await connection.commit();
            } catch (error) {
                await connection.rollback();
                if (String(error).includes('ORA-00001')) throw new Error('CONTA_EXISTENTE');
                throw error;
            }
        });

        const updatedUser = await currentUser(context);
        return json({ ok: true, user: updatedUser });
    } catch (error) {
        return errorResponse(error);
    }
};
