CREATE OR REPLACE TRIGGER tg_murm_post_biu
    BEFORE INSERT OR UPDATE
    ON murm_post
    FOR EACH ROW
BEGIN
    IF INSERTING AND :new.created_at IS NULL THEN
        :new.created_at := SYSTIMESTAMP;
    END IF;

    IF UPDATING THEN
        :new.updated_at := SYSTIMESTAMP;
    END IF;
END;
/
