import { access } from 'node:fs/promises';
import { join } from 'node:path';
import oracledb, { type Connection, type Pool } from 'oracledb';

let poolPromise: Promise<Pool> | null = null;

function required(name: string): string {
    const value = import.meta.env[name]?.trim();

    if (!value) {
        throw new Error(`Variável obrigatória não configurada: ${name}`);
    }

    return value;
}

function numberEnv(name: string, fallback: number): number {
    const value = Number(import.meta.env[name] || fallback);
    return Number.isFinite(value) ? value : fallback;
}

async function validateWallet(walletDir: string): Promise<void> {
    try {
        await access(join(walletDir, 'tnsnames.ora'));
        await access(join(walletDir, 'ewallet.pem'));
    } catch {
        throw new Error('ORACLE_WALLET_INVALIDA');
    }
}

async function createPool(): Promise<Pool> {
    const walletDir = required('ORACLE_WALLET_DIR');
    await validateWallet(walletDir);

    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    return oracledb.createPool({
        user: required('ORACLE_USER'),
        password: required('ORACLE_PASSWORD'),
        connectString: required('ORACLE_CONNECT_STRING'),
        configDir: walletDir,
        walletLocation: walletDir,
        walletPassword: required('ORACLE_WALLET_PASSWORD'),
        connectTimeout: numberEnv('ORACLE_CONNECT_TIMEOUT_SECONDS', 5),
        transportConnectTimeout: numberEnv('ORACLE_TRANSPORT_TIMEOUT_SECONDS', 3),
        poolMin: numberEnv('ORACLE_POOL_MIN', 0),
        poolMax: numberEnv('ORACLE_POOL_MAX', 4),
        poolIncrement: numberEnv('ORACLE_POOL_INCREMENT', 1),
        queueTimeout: numberEnv('ORACLE_QUEUE_TIMEOUT_MS', 10000),
    });
}

export async function getPool(): Promise<Pool> {
    if (!poolPromise) {
        poolPromise = createPool().catch(error => {
            poolPromise = null;
            throw error;
        });
    }

    return poolPromise;
}

export async function withConnection<T>(callback: (connection: Connection) => Promise<T>): Promise<T> {
    const pool = await getPool();
    let connection: Connection | null = null;

    try {
        connection = await pool.getConnection();
        return await callback(connection);
    } catch (error) {
        const text = String(error);

        if (
            text.includes('NJS-040') ||
            text.includes('NJS-500') ||
            text.includes('NJS-503') ||
            text.includes('ORA-01017') ||
            text.includes('ORA-12154') ||
            text.includes('ORA-125') ||
            text.includes('ORA-29024')
        ) {
            throw new Error('ORACLE_INDISPONIVEL');
        }

        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}
