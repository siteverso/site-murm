# TEST REPORT — site-murm-baralho-vento-3d

## Ajustes
- arremesso desacelerado para aproximadamente 0,82–1,32 s
- trajetória em múltiplos pontos, com leve oscilação como vento
- profundidade 3D com rotateX, rotateY, rotateZ e translateZ
- blur progressivo apenas na saída final
- direção e inclinação continuam respeitando o gesto

## Validações
- `node --check public/js/feed/card-deck.js` ✅
- `node --check public/app.js` ✅
- `node --test tests/home-card-deck.test.mjs` ✅ 4/4
- `npm run build` ✅
