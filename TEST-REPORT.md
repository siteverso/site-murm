# TEST REPORT — site-murm-baralho-tinder-glow

## Escopo
- reforço visual do modo Baralho 3D na Home
- swipe estilo Tinder
- direita = Ecoar
- esquerda = Silenciar
- glow visível ao atingir o limiar mínimo da ação
- saída automática da carta ao soltar após o limiar
- fila contínua com buffer de até 100 murmúrios e reposição contínua

## Validações executadas
- `node --test tests/home-card-deck.test.mjs` ✅ 3/3
- `npm run build` ✅

## Observações
- a ação do swipe usa o endpoint real de voto (`/api/posts/:id/vote`)
- o baralho mantém pilha visual contínua e reabastece a fila antes de esgotar
- ícones laterais e glow mudam conforme a direção armada
