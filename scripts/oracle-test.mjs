import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import oracledb from 'oracledb';

function required(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Variável obrigatória não configurada: ${name}`);
    }

    return value;
}

const walletDir = required('ORACLE_WALLET_DIR');
const connectString = required('ORACLE_CONNECT_STRING');

try {
    await access(walletDir);
    await access(join(walletDir, 'tnsnames.ora'));

    const tnsnames = await readFile(join(walletDir, 'tnsnames.ora'), 'utf8');
    const aliases = [...tnsnames.matchAll(/^([a-zA-Z0-9_.-]+)\s*=\s*\(description/gim)].map(match => match[1]);

    console.log(`Wallet: ${walletDir}`);
    console.log(`Serviço configurado: ${connectString}`);
    console.log(`Serviços encontrados: ${aliases.join(', ') || 'nenhum'}`);

    if (aliases.length && !aliases.some(alias => alias.toLowerCase() === connectString.toLowerCase())) {
        throw new Error(`ORACLE_CONNECT_STRING não existe no tnsnames.ora: ${connectString}`);
    }

    const connection = await oracledb.getConnection({
        user: required('ORACLE_USER'),
        password: required('ORACLE_PASSWORD'),
        connectString,
        configDir: walletDir,
        walletLocation: walletDir,
    });

    try {
        const result = await connection.execute(`SELECT USER AS username, SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS service_name FROM dual`);
        console.log('Conexão Oracle OK.');
        console.table(result.rows || []);
    } finally {
        await connection.close();
    }
} catch (error) {
    console.error('Falha na conexão Oracle:');
    console.error(error);
    process.exitCode = 1;
}
