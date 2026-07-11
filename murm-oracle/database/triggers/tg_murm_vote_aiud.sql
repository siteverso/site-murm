CREATE OR REPLACE TRIGGER tg_murm_vote_aiud
    AFTER INSERT OR UPDATE OR DELETE
    ON murm_vote
    FOR EACH ROW
BEGIN
    IF INSERTING THEN
        UPDATE murm_post
        SET positive_count = positive_count + CASE WHEN :new.vote_value = 1 THEN 1 ELSE 0 END,
            negative_count = negative_count + CASE WHEN :new.vote_value = -1 THEN 1 ELSE 0 END
        WHERE id = :new.post_id;
    ELSIF UPDATING THEN
        UPDATE murm_post
        SET positive_count = positive_count
                             - CASE WHEN :old.vote_value = 1 THEN 1 ELSE 0 END
                             + CASE WHEN :new.vote_value = 1 THEN 1 ELSE 0 END,
            negative_count = negative_count
                             - CASE WHEN :old.vote_value = -1 THEN 1 ELSE 0 END
                             + CASE WHEN :new.vote_value = -1 THEN 1 ELSE 0 END
        WHERE id = :new.post_id;
    ELSIF DELETING THEN
        UPDATE murm_post
        SET positive_count = positive_count - CASE WHEN :old.vote_value = 1 THEN 1 ELSE 0 END,
            negative_count = negative_count - CASE WHEN :old.vote_value = -1 THEN 1 ELSE 0 END
        WHERE id = :old.post_id;
    END IF;
END;
/
