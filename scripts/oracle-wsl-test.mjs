import oracledb from 'oracledb';

function required(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Variável obrigatória ausente: ${name}`);
    }

    return value;
}

let connection;
const startedAt = Date.now();

try {
    console.log('Conectando ao Oracle...');

    connection = await oracledb.getConnection({
        user: required('ORACLE_USER'),
        password: required('ORACLE_PASSWORD'),
        connectString: required('ORACLE_CONNECT_STRING'),
        configDir: required('ORACLE_WALLET_DIR'),
        walletLocation: required('ORACLE_WALLET_DIR'),
        walletPassword: required('ORACLE_WALLET_PASSWORD'),
        connectTimeout: 5,
        transportConnectTimeout: 3,
    });

    const result = await connection.execute(`
        SELECT USER AS usuario,
               SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS servico
          FROM dual
    `);

    console.log(`ORACLE OK em ${Date.now() - startedAt} ms`);
    console.table(result.rows);
} catch (error) {
    console.error(`ORACLE FALHOU em ${Date.now() - startedAt} ms`);
    console.error(error);
    process.exitCode = 1;
} finally {
    if (connection) {
        await connection.close();
    }
}
