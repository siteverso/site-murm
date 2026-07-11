DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_tab_columns
    WHERE table_name = 'MURM_USER'
      AND column_name = 'USERNAME_SET_AT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD username_set_at TIMESTAMP
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
      AND column_name = 'USERNAME_CHANGE_COUNT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD username_change_count NUMBER(1) DEFAULT 0 NOT NULL
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
      AND constraint_name = 'CK_MURM_USER_USERNAME_CHANGE_COUNT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD CONSTRAINT ck_murm_user_username_change_count
            CHECK (username_change_count IN (0, 1))
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
      AND column_name = 'EMAIL_SET_AT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD email_set_at TIMESTAMP
        ';
    END IF;
END;
/

UPDATE murm_user
SET username_set_at = NVL(created_at, SYSTIMESTAMP)
WHERE username_set_at IS NULL;

UPDATE murm_user
SET email_set_at = NVL(created_at, SYSTIMESTAMP)
WHERE email_set_at IS NULL;

ALTER TABLE murm_user
MODIFY username_set_at DEFAULT SYSTIMESTAMP NOT NULL;

ALTER TABLE murm_user
MODIFY email_set_at DEFAULT SYSTIMESTAMP NOT NULL;

COMMIT;
