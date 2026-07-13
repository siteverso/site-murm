# Arquitetura JavaScript

Os arquivos são carregados sequencialmente por `public/app.js`. A ordem preserva o comportamento do antigo monólito enquanto as responsabilidades ficam separadas por sistema.

- `core/runtime.js`: utilitários, API, estado compartilhado e sincronização.
- `user/user.js`: usuário atual, avatar e resumo do perfil.
- `posts/posts-and-replies.js`: árvore, cards, respostas e histórico.
- `feed/feed-renderer.js`: skeleton, colunas, carregamento e polling.
- `feed/feed-view-controller.js`: seleção e persistência do modo de visualização.
- `feed/reply-thread-controller.js`: abertura, expansão, recolhimento e hover das respostas.
- `feed/inline-post-editor.js`: edição inline e estado visual otimista das ações.
- `feed/published-reply-controller.js`: atualização e revelação de respostas recém-publicadas.
- `feed/feed-interactions.js`: delegação dos eventos de clique, duplo clique e envio.
- `ui/ui.js`: modal, compositor e componentes de interface.
- `profile/profile.js`: foto, recorte, países e conta.
- `auth/auth.js`: login, cadastro e recuperação.
- `directs/directs.js`: mensagens privadas e polling.
- `core/bootstrap.js`: erros globais e inicialização.

## Regra de manutenção

Não altere `public/app.js` para adicionar funcionalidades. Edite o módulo responsável. Preserve a ordem do manifesto quando um módulo depender de declarações anteriores.
