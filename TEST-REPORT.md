# TEST REPORT — site-murm-baralho-fluido-subida

## Escopo
- subida fluida das cartas inferiores quando a carta superior sai
- retorno suave quando o gesto não atinge o limiar
- gesto para cima abre a página normal do murmúrio
- glow e indicador visual para o gesto de abrir
- manutenção do fullstage e da ausência de rolagem indevida

## Validações
- `node --test tests/home-card-deck.test.mjs` ✅ 5/5
- `node --check public/app.js` ✅
- `node --check public/js/feed/card-deck.js` ✅
- `npm run build` ✅
