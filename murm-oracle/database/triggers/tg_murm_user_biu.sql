CREATE OR REPLACE TRIGGER tg_murm_user_biu
    BEFORE INSERT OR UPDATE
    ON murm_user
    FOR EACH ROW
BEGIN
    :new.username := lower(trim(:new.username));
    :new.email := lower(trim(:new.email));

    IF INSERTING AND :new.created_at IS NULL THEN
        :new.created_at := SYSTIMESTAMP;
    END IF;

    IF UPDATING THEN
        :new.updated_at := SYSTIMESTAMP;
    END IF;
END;
/
