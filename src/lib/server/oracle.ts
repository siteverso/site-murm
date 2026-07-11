import oracledb, { type Connection, type Pool } from 'oracledb';

let poolPromise: Promise<Pool> | null = null;

function required(name: string): string {
    const value = import.meta.env[name]?.trim();

    if (!value) {
        throw new Error(`Variável obrigatória não configurada: ${name}`);
    }

    return value;
}

async function createPool(): Promise<Pool> {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    return oracledb.createPool({
        user: required('ORACLE_USER'),
        password: required('ORACLE_PASSWORD'),
        connectString: required('ORACLE_CONNECT_STRING'),
        configDir: required('ORACLE_WALLET_DIR'),
        walletLocation: required('ORACLE_WALLET_DIR'),
        poolMin: Number(import.meta.env.ORACLE_POOL_MIN || 1),
        poolMax: Number(import.meta.env.ORACLE_POOL_MAX || 8),
        poolIncrement: Number(import.meta.env.ORACLE_POOL_INCREMENT || 1),
    });
}

export async function getPool(): Promise<Pool> {
    poolPromise ??= createPool();
    return poolPromise;
}

export async function withConnection<T>(callback: (connection: Connection) => Promise<T>): Promise<T> {
    const pool = await getPool();
    const connection = await pool.getConnection();

    try {
        return await callback(connection);
    } finally {
        await connection.close();
    }
}
