ALTER TABLE murm_post ADD (visibility_code VARCHAR2(20) DEFAULT 'public' NOT NULL);

ALTER TABLE murm_post ADD CONSTRAINT ck_murm_post_visibility
    CHECK (visibility_code IN ('public', 'private'));

CREATE INDEX ix_murm_post_visibility_parent
    ON murm_post (parent_post_id, visibility_code, user_id);
