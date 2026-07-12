# Relatório de validação

## Alteração

- Mantido o LED de ecoar/ignorar já aprovado.
- O botão **Responder** agora recebe estado ligado quando o usuário atual possui ao menos uma resposta publicada diretamente naquele murmúrio.
- O estado vem do banco (`hasMyReply`), sem armazenamento paralelo no navegador.
- O comportamento também foi aplicado às consultas de thread e de expansão de ramo.

## Validação

- `node --test tests/reply-led-state.test.mjs tests/vote-led-state.test.mjs`: 6 testes aprovados.
- `npm run build`: build Astro concluído com sucesso.
- A suíte completa ainda contém assertions antigas e frágeis de formatação/assinatura que já falhavam por diferenças textuais; não indicam erro de execução desta alteração.
