CREATE INDEX ix_murm_post_user_created ON murm_post (user_id, created_at DESC);
CREATE INDEX ix_murm_post_parent_created ON murm_post (parent_post_id, created_at);
CREATE INDEX ix_murm_post_status_created ON murm_post (status, created_at DESC);
CREATE INDEX ix_murm_vote_post ON murm_vote (post_id);
CREATE INDEX ix_murm_vote_user ON murm_vote (user_id);
CREATE INDEX ix_murm_share_post ON murm_share (post_id);
CREATE INDEX ix_murm_session_user_expires ON murm_session (user_id, expires_at);
