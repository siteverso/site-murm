DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_tab_columns
    WHERE table_name = 'MURM_USER'
      AND column_name = 'SEX_CODE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD sex_code VARCHAR2(1)
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
      AND constraint_name = 'CK_MURM_USER_SEX';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD CONSTRAINT ck_murm_user_sex
            CHECK (sex_code IN (''M'', ''F''))
        ';
    END IF;
END;
/
