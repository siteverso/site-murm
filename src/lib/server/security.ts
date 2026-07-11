import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

export function normalizeUsername(value: unknown): string {
    return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

export function normalizeEmail(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

export function validateUsername(username: string): void {
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        throw new Error('USUARIO_INVALIDO');
    }
}

export function validateEmail(email: string): void {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
        throw new Error('EMAIL_INVALIDO');
    }
}

export function validatePassword(password: string): void {
    if (password.length < 6) {
        throw new Error('SENHA_INVALIDA');
    }
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function createToken(): string {
    return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
