-- Acrescenta os temas Rosa e Purple sem alterar as preferências já salvas.
BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE murm_user DROP CONSTRAINT ck_murm_user_theme';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -2443 THEN RAISE; END IF;
END;
/

ALTER TABLE murm_user ADD CONSTRAINT ck_murm_user_theme
CHECK (theme_code IN ('pearl', 'graphite', 'ocean', 'forest', 'sunset', 'rose', 'purple'));

COMMIT;
