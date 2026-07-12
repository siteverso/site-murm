# TEST REPORT — site-murm-baralho-resposta-imediata

## Ajuste
- próxima carta liberada quase imediatamente após soltar a anterior
- carta arremessada passa a voar em uma camada independente
- hover e drag da nova carta ficam disponíveis em cerca de 70 ms
- subida da pilha permanece animada e fluida
- abertura para cima continua levando à página do murmúrio

## Validações
- `node --test tests/home-card-deck.test.mjs` ✅ 5/5
- `node --check public/js/feed/card-deck.js` ✅
- `npm run build` ✅
