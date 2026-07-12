# Relatório de validação — avatar nos murmúrios

## Alteração entregue

- O feed principal, as threads específicas, os ramos de respostas e o histórico de respostas agora recebem a URL real do avatar do autor.
- A resolução do avatar reutiliza `avatarSql()` e `getUserSchema()`, o mesmo contrato já usado pelo restante do sistema.
- O renderizador existente foi preservado: mostra a imagem quando disponível e mantém as iniciais como fallback.
- Nenhuma alteração foi feita no segundo item do TODO (efeito LED nos ícones).

## Testes executados

1. Testes novos de regressão do avatar: 2 aprovados.
2. Suíte automatizada completa: 73 aprovados e 5 falhas preexistentes em testes que ainda procuram funções dentro do antigo `public/app.js`, apesar de essas funções já estarem nos módulos de `public/js/`.
3. Build Astro SSR com `npm run build`: concluído com sucesso.
4. Compilação TypeScript/Astro das consultas SQL dinâmicas: concluída durante o build.

## Limite da validação local

Não foi possível validar a leitura do BLOB contra o Oracle de produção porque o ambiente local não possui a sessão e as credenciais do banco real. A rota de avatar e o contrato SQL já existentes foram preservados.
