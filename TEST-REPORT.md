# TEST REPORT — retorno físico parametrizável

## Alterações
- mantida a página `/teste-retorno-baralho`
- retorno mais suave com quatro keyframes físicos
- parâmetros expostos na página de teste:
  - posição X/Y
  - duração e fator de distância
  - velocidade X/Y
  - aceleração X/Y
  - direção
  - profundidade Z e elevação
  - rotação X/Y/Z
  - velocidade angular
  - escala
  - overshoot e limites
  - amortecimento
  - offsets dos keyframes
  - curva de aceleração
- painel mostra o JSON completo dos parâmetros atuais
- drag manual mede a velocidade real do ponteiro e preenche os campos
- a função continua desacoplada em `public/js/feed/deck-return-motion.js`

## Validações
- `node --check public/js/feed/deck-return-motion.js` ✅
- `node --test tests/deck-return-motion.test.mjs` ✅ 3/3
- `npm run build` ✅
