# TEST REPORT — site-murm-baralho-fullstage-arremesso-v2

## Correções
- cartas alinhadas e retas no repouso
- ícones de Ecoar/Silenciar reposicionados dentro da própria carta
- fullstage mantido sem clipping lateral
- arremesso visível após soltar acima do limiar
- animação segue direção, velocidade e torque do gesto
- removido desaparecimento instantâneo causado por animação reduzida a 1 ms

## Validações
- `node --check public/app.js` ✅
- `node --check public/js/feed/card-deck.js` ✅
- `node --test tests/home-card-deck.test.mjs` ✅ 4/4
- `npm run build` ✅
