export function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}

export async function body<T>(request: Request): Promise<T> {
    try {
        return await request.json() as T;
    } catch {
        throw new Error('JSON_INVALIDO');
    }
}

export function errorResponse(error: unknown): Response {
    console.error(error);

    const message = error instanceof Error ? error.message : 'ERRO_INTERNO';

    const known: Record<string, [number, string]> = {
        JSON_INVALIDO: [400, 'Dados inválidos.'],
        NAO_AUTENTICADO: [401, 'Sessão inválida ou expirada.'],
        USUARIO_INVALIDO: [400, 'Usuário inválido.'],
        EMAIL_INVALIDO: [400, 'E-mail inválido.'],
        SENHA_INVALIDA: [400, 'A senha deve ter pelo menos 6 caracteres.'],
        SENHAS_DIFERENTES: [400, 'As senhas não conferem.'],
        CONTA_EXISTENTE: [409, 'Usuário ou e-mail já cadastrado.'],
        LOGIN_INVALIDO: [401, 'Usuário/e-mail ou senha inválidos.'],
        GOOGLE_INVALIDO: [401, 'Não foi possível validar a conta Google.'],
        POST_NAO_ENCONTRADO: [404, 'Murmúrio não encontrado.'],
        RESPOSTA_NAO_ENCONTRADA: [404, 'Resposta não encontrada.'],
        DIRECT_INVALIDO: [400, 'Bilhete inválido ou destinatário indisponível.'],
        DIRECT_NAO_ENCONTRADO: [404, 'Bilhete não encontrado ou sem permissão para excluir.'],
        SEM_PERMISSAO: [403, 'Você não pode executar esta ação.'],
        RESET_DESABILITADO: [501, 'Recuperação por e-mail ainda não configurada.'],
        ORACLE_WALLET_INVALIDA: [503, 'A carteira Oracle não foi encontrada ou está incompleta.'],
        ORACLE_INDISPONIVEL: [503, 'Não foi possível conectar ao banco Oracle. Confira usuário, senha, serviço e Wallet.'],
    };

    const [status, publicMessage] = known[message] || [500, 'Erro interno.'];
    return json({ ok: false, error: publicMessage }, status);
}
