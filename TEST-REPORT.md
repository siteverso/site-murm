# TEST REPORT — site-murm-baralho-vento-lento-sem-rolagem

## Escopo
- desacelerar a saída das cartas
- manter efeito de vento e profundidade 3D
- impedir rolagem horizontal ou vertical do browser quando a carta ultrapassar os limites do viewport
- bloquear gesto de scroll enquanto o modo Baralho estiver ativo

## Validações
- `node --check public/app.js` ✅
- `node --check public/js/feed/card-deck.js` ✅
- `node --test tests/home-card-deck.test.mjs` ✅ 4/4
- `npm run build` ✅

## Resultado
- duração do arremesso entre 1,5 s e 2,2 s
- `html` e `body` entram em modo sem rolagem durante o Baralho
- ao trocar para outro modo de visualização, a rolagem normal é restaurada
