DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_tab_columns
    WHERE table_name = 'MURM_USER'
      AND column_name = 'SEX_SET_AT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD sex_set_at TIMESTAMP
        ';
    END IF;
END;
/

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_tab_columns
    WHERE table_name = 'MURM_USER'
      AND column_name = 'SEX_CHANGE_COUNT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD sex_change_count NUMBER(1) DEFAULT 0 NOT NULL
        ';
    END IF;
END;
/

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_constraints
    WHERE table_name = 'MURM_USER'
      AND constraint_name = 'CK_MURM_USER_SEX_CHANGE_COUNT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD CONSTRAINT ck_murm_user_sex_change_count
            CHECK (sex_change_count IN (0, 1))
        ';
    END IF;
END;
/

UPDATE murm_user
SET sex_set_at = SYSTIMESTAMP
WHERE sex_code IS NOT NULL
  AND sex_set_at IS NULL;

COMMIT;
