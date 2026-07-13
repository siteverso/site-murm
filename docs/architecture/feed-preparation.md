# Preparação estrutural do feed

Esta etapa não muda comportamento, layout, consulta, rota ou interação.

## Contratos introduzidos

- `MurmFeedContracts`: concentra modos de visualização, modos de agrupamento, grupos de colunas e paginação.
- `MurmFeedContext`: normaliza o contexto reutilizável do feed (`parentId`, `viewMode`, `groupBy`).
- O runtime atual continua consumindo os mesmos nomes globais (`FEED_BATCH_SIZE` e `COLUMN_GROUPS`) para preservar compatibilidade.

## Próximos encaixes, ainda não implementados

- Home: `createFeedContext({ parentId: null })`.
- Página contextual: `createFeedContext({ parentId })`.
- Baralho: apenas um `viewMode`, independente do agrupamento.
- Novos agrupamentos entram no contrato sem criar outro feed.

## Regra de regressão

Nesta preparação, a saída visual e todos os fluxos atuais devem permanecer idênticos.
