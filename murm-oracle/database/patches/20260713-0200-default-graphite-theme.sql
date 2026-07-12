-- Define Grafite como tema padrão para novos usuários e registros sem escolha válida.
-- Patch incremental: preserva escolhas explícitas já gravadas.

ALTER TABLE murm_user MODIFY theme_code DEFAULT 'graphite';

UPDATE murm_user
SET theme_code = 'graphite'
WHERE theme_code IS NULL
   OR LOWER(TRIM(theme_code)) = 'auto';

COMMIT;
