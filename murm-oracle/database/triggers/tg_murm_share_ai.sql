CREATE OR REPLACE TRIGGER tg_murm_share_ai
    AFTER INSERT
    ON murm_share
    FOR EACH ROW
BEGIN
    UPDATE murm_post
    SET share_count = share_count + 1
    WHERE id = :new.post_id;
END;
/
