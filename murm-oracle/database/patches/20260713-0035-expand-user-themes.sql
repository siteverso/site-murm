-- Amplia a preferência visual por usuário para os cinco temas do site-murm.
BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE murm_user DROP CONSTRAINT ck_murm_user_theme';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -2443 THEN RAISE; END IF;
END;
/

UPDATE murm_user
SET theme_code = CASE LOWER(TRIM(theme_code))
    WHEN 'dark' THEN 'graphite'
    WHEN 'light' THEN 'pearl'
    WHEN 'auto' THEN 'pearl'
    ELSE LOWER(TRIM(theme_code))
END
WHERE LOWER(TRIM(theme_code)) IN ('dark', 'light', 'auto');

ALTER TABLE murm_user MODIFY theme_code VARCHAR2(20) DEFAULT 'pearl' NOT NULL;

ALTER TABLE murm_user ADD CONSTRAINT ck_murm_user_theme
CHECK (theme_code IN ('pearl', 'graphite', 'ocean', 'forest', 'sunset'));

COMMIT;
