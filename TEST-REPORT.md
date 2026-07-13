# Relatório de validação

## Correções desta entrega

- Removido o card redundante “Resposta publicada / Abrir conversa completa”.
- Mantidos a inserção da resposta, a expansão do ramo, o contador e o destaque temporário.
- O nome do usuário no painel lateral agora é um link para o perfil exibido.

## Testes

- 5 testes direcionados passaram.
- `node --check` do controlador de respostas passou.
- O build Astro não foi executado porque o pacote recebido não contém `node_modules` e o comando `astro` não está instalado neste ambiente.
