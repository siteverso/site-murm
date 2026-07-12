-- Preferência de idioma do feed, separada do idioma de exibição.
-- Patch incremental: adiciona apenas os campos necessários ao estado atual.

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
      FROM user_tab_columns
     WHERE table_name = 'MURM_USER'
       AND column_name = 'PREFERRED_LANGUAGE_CODE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            ALTER TABLE murm_user
            ADD preferred_language_code VARCHAR2(10) DEFAULT 'pt-BR' NOT NULL
        ]';
    END IF;
END;
/

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
      FROM user_constraints
     WHERE table_name = 'MURM_USER'
       AND constraint_name = 'CK_MURM_USER_PREF_LANG';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            ALTER TABLE murm_user
            ADD CONSTRAINT ck_murm_user_pref_lang
            CHECK (preferred_language_code IN ('pt-BR', 'en', 'es'))
        ]';
    END IF;
END;
/

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
      FROM user_tab_columns
     WHERE table_name = 'MURM_POST'
       AND column_name = 'LANGUAGE_CODE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            ALTER TABLE murm_post
            ADD language_code VARCHAR2(10)
        ]';
    END IF;
END;
/

UPDATE murm_post p
   SET language_code = (
       SELECT NVL(u.language_code, 'pt-BR')
         FROM murm_user u
        WHERE u.id = p.user_id
   )
 WHERE p.language_code IS NULL;

ALTER TABLE murm_post MODIFY language_code DEFAULT 'pt-BR' NOT NULL;

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
      FROM user_constraints
     WHERE table_name = 'MURM_POST'
       AND constraint_name = 'CK_MURM_POST_LANGUAGE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE q'[
            ALTER TABLE murm_post
            ADD CONSTRAINT ck_murm_post_language
            CHECK (language_code IN ('pt-BR', 'en', 'es'))
        ]';
    END IF;
END;
/

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
      FROM user_indexes
     WHERE index_name = 'IX_MURM_POST_FEED_LANGUAGE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE INDEX ix_murm_post_feed_language ON murm_post (language_code, created_at DESC)';
    END IF;
END;
/
