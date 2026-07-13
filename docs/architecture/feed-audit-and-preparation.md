# Auditoria e preparação estrutural do feed

## Escopo desta etapa

Esta etapa não altera layout, filtros visíveis, rotas ou comportamento funcional. Ela cria limites internos para que a Home e os futuros feeds contextuais reutilizem a mesma implementação.

## Situação encontrada

- `feed-renderer.js` misturava consulta, seleção de endpoint, agrupamento e renderização.
- A seleção de colunas por sexo, relevância e usuários estava presa ao renderizador.
- A URL do feed era montada diretamente dentro de `loadFeed`, dificultando receber um contexto por `parentId`.
- O baralho continua isolado como modo visual e não foi funcionalmente alterado nesta etapa.

## Contratos preparados

- `feed-context.js`: normaliza `parentId`, modo visual e agrupamento.
- `feed-query.js`: lê o contexto do DOM e constrói o endpoint sem conhecer a renderização.
- `feed-grouping.js`: organiza itens por estratégia sem conhecer DOM, baralho ou rede.
- `feed-renderer.js`: mantém as funções públicas atuais, delegando consulta e agrupamento aos módulos especializados.

## Compatibilidade

As funções globais e a ordem operacional existentes foram preservadas. A Home continua sem `parentId`, portanto usa `/api/posts`. Um futuro contêiner com `data-parent-id` poderá usar a mesma carga com `/api/posts?parentId=...`, sem criar outro feed.
