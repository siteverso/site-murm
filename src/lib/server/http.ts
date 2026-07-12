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
        USUARIO_AGUARDE_30_DIAS: [409, 'O usuário só pode ser corrigido 30 dias após a definição anterior.'],
        USUARIO_ALTERACAO_ESGOTADA: [409, 'A única correção de usuário permitida para esta conta já foi utilizada.'],
        EMAIL_INVALIDO: [400, 'E-mail inválido.'],
        EMAIL_AGUARDE_30_DIAS: [409, 'O e-mail só pode ser alterado uma vez a cada 30 dias.'],
        SENHA_INVALIDA: [400, 'A senha deve ter pelo menos 6 caracteres.'],
        SENHAS_DIFERENTES: [400, 'As senhas não conferem.'],
        CONTA_EXISTENTE: [409, 'Usuário ou e-mail já cadastrado.'],
        LOGIN_INVALIDO: [401, 'Usuário/e-mail ou senha inválidos.'],
        GOOGLE_INVALIDO: [401, 'Não foi possível validar a conta Google.'],
        AVATAR_INVALIDO: [400, 'Selecione uma imagem válida.'],
        AVATAR_MUITO_GRANDE: [413, 'A imagem deve ter no máximo 3 MB.'],
        AVATAR_TIPO_INVALIDO: [415, 'Use uma imagem JPG, PNG ou WebP.'],
        POST_NAO_ENCONTRADO: [404, 'Murmúrio não encontrado.'],
        RESPOSTA_NAO_ENCONTRADA: [404, 'Resposta não encontrada.'],
        DIRECT_INVALIDO: [400, 'Bilhete inválido ou destinatário indisponível.'],
        DIRECT_AGUARDE: [429, 'Aguarde 2 segundos antes de enviar outro bilhete.'],
        DIRECT_NAO_ENCONTRADO: [404, 'Bilhete não encontrado ou sem permissão para alterar.'],
        SEM_PERMISSAO: [403, 'Você não pode executar esta ação.'],
        SEXO_NAO_PODE_REMOVER: [400, 'Depois de definido, o sexo não pode ser removido.'],
        SEXO_AGUARDE_30_DIAS: [409, 'A correção do sexo só é permitida 30 dias após a definição anterior.'],
        SEXO_ALTERACAO_ESGOTADA: [409, 'A única correção de sexo permitida para esta conta já foi utilizada.'],
        RESET_DESABILITADO: [501, 'Recuperação por e-mail ainda não configurada.'],
        ORACLE_WALLET_INVALIDA: [503, 'A carteira Oracle não foi encontrada ou está incompleta.'],
        ORACLE_INDISPONIVEL: [503, 'Não foi possível conectar ao banco Oracle. Confira usuário, senha, serviço e Wallet.'],
        PAISES_INDISPONIVEIS: [503, 'Não foi possível carregar a lista de países agora.'],
    };

    const [status, publicMessage] = known[message] || [500, 'Erro interno.'];
    return json({ ok: false, error: publicMessage }, status);
}
