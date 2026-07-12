# Organização dos estilos

- `global.css`: entrada única; contém somente imports na ordem da cascata.
- `core/`: tokens, reset e regras fundamentais.
- `layout/`: estrutura compartilhada da aplicação.
- `components/`: estilos de componentes e processos reutilizáveis.
- `pages/`: regras específicas de cada página ou domínio visual.

Ao criar uma regra nova, coloque-a no arquivo do componente/página responsável. Só use `core` ou `layout` quando a regra for realmente global.
