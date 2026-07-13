# Relatório de teste — estabilidade do scroll após respostas profundas

## Causa revisada

A correção anterior parava após 700 ms sem movimento. O feed, porém, consulta novamente o servidor a cada 2 segundos. Essa atualização posterior podia reconstruir a árvore sem manter todos os nós profundos expandidos, fazendo a resposta desaparecer e o navegador reposicionar a página para o topo.

## Correções

- A âncora visual não é mais encerrada após apenas 700 ms de silêncio; ela acompanha alterações tardias por até 15 segundos ou até uma ação real do usuário.
- O scroll anchoring automático do navegador é temporariamente desativado durante a transação, evitando conflito com a correção do aplicativo.
- Todos os nós do caminho da resposta publicada são registrados em `expandedIds`.
- A assinatura do feed é sincronizada após a publicação, evitando uma reconstrução redundante no polling seguinte.

## Testes executados

- Teste dinâmico simulando um primeiro deslocamento e um segundo deslocamento 2,5 segundos depois: passou.
- Teste de desativação temporária do `overflow-anchor`: passou.
- Teste de persistência do caminho profundo no polling: passou.
- Testes específicos de publicação profunda, renderização recursiva, contador e destaque: passaram.
- Suíte completa: 156 testes; 139 passaram e 17 falhas já existentes no pacote recebido permaneceram.

## Limitação do ambiente

Não foi possível reproduzir a interação contra o banco e o navegador real do ambiente WSL do usuário. O teste novo simula explicitamente a atualização tardia que causava o segundo salto.
