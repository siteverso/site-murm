
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_tab_columns
    WHERE table_name = 'MURM_USER'
      AND column_name = 'PASSWORD_CHANGED_AT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD password_changed_at TIMESTAMP
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
      AND column_name = 'THEME_CODE';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD theme_code VARCHAR2(10) DEFAULT ''auto'' NOT NULL
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
      AND constraint_name = 'CK_MURM_USER_THEME';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_user
            ADD CONSTRAINT ck_murm_user_theme
            CHECK (theme_code IN (''light'', ''dark'', ''auto''))
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
    WHERE table_name = 'MURM_POST'
      AND column_name = 'DELETED_AT';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_post
            ADD deleted_at TIMESTAMP
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
    WHERE table_name = 'MURM_POST'
      AND column_name = 'DELETED_BY_USER_ID';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_post
            ADD deleted_by_user_id NUMBER
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
    WHERE table_name = 'MURM_POST'
      AND constraint_name = 'FK_MURM_POST_DELETED_BY';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE murm_post
            ADD CONSTRAINT fk_murm_post_deleted_by
            FOREIGN KEY (deleted_by_user_id)
            REFERENCES murm_user (id)
        ';
    END IF;
END;
/

CREATE OR REPLACE TRIGGER tg_murm_user_biu
    BEFORE INSERT OR UPDATE
    ON murm_user
    FOR EACH ROW
BEGIN
    IF INSERTING THEN
        :new.created_at := NVL(:new.created_at, SYSTIMESTAMP);
    END IF;

    :new.username  := LOWER(TRIM(:new.username));
    :new.email     := LOWER(TRIM(:new.email));
    :new.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER tg_murm_post_biu
    BEFORE INSERT OR UPDATE
    ON murm_post
    FOR EACH ROW
BEGIN
    IF INSERTING THEN
        :new.created_at := NVL(:new.created_at, SYSTIMESTAMP);
    END IF;

    :new.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER tg_murm_vote_aiud
    AFTER INSERT OR UPDATE OR DELETE
    ON murm_vote
    FOR EACH ROW
BEGIN
    IF INSERTING THEN
        IF :new.vote_value = 1 THEN
            UPDATE murm_post
            SET positive_count = positive_count + 1
            WHERE id = :new.post_id;
        ELSE
            UPDATE murm_post
            SET negative_count = negative_count + 1
            WHERE id = :new.post_id;
        END IF;
    ELSIF DELETING THEN
        IF :old.vote_value = 1 THEN
            UPDATE murm_post
            SET positive_count = GREATEST(positive_count - 1, 0)
            WHERE id = :old.post_id;
        ELSE
            UPDATE murm_post
            SET negative_count = GREATEST(negative_count - 1, 0)
            WHERE id = :old.post_id;
        END IF;
    ELSIF UPDATING AND :old.vote_value <> :new.vote_value THEN
        IF :old.vote_value = 1 THEN
            UPDATE murm_post
            SET positive_count = GREATEST(positive_count - 1, 0),
                negative_count = negative_count + 1
            WHERE id = :new.post_id;
        ELSE
            UPDATE murm_post
            SET negative_count = GREATEST(negative_count - 1, 0),
                positive_count = positive_count + 1
            WHERE id = :new.post_id;
        END IF;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER tg_murm_share_aiud
    AFTER INSERT OR DELETE
    ON murm_share
    FOR EACH ROW
BEGIN
    IF INSERTING THEN
        UPDATE murm_post
        SET share_count = share_count + 1
        WHERE id = :new.post_id;
    ELSIF DELETING THEN
        UPDATE murm_post
        SET share_count = GREATEST(share_count - 1, 0)
        WHERE id = :old.post_id;
    END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER tg_murm_share_ai';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -4080 THEN
            RAISE;
        END IF;
END;
/
