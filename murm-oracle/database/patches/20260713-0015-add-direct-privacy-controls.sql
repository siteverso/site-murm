CREATE TABLE murm_direct_user_state
(
    user_id            NUMBER NOT NULL,
    other_user_id      NUMBER NOT NULL,
    archived_at        TIMESTAMP,
    deleted_before_id  NUMBER DEFAULT 0 NOT NULL,
    updated_at         TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,

    CONSTRAINT pk_murm_direct_user_state PRIMARY KEY (user_id, other_user_id),
    CONSTRAINT fk_murm_direct_state_user FOREIGN KEY (user_id) REFERENCES murm_user (id),
    CONSTRAINT fk_murm_direct_state_other FOREIGN KEY (other_user_id) REFERENCES murm_user (id),
    CONSTRAINT ck_murm_direct_state_users CHECK (user_id <> other_user_id)
);

CREATE INDEX ix_murm_direct_state_other
    ON murm_direct_user_state (other_user_id, user_id);

CREATE TABLE murm_user_block
(
    blocker_user_id  NUMBER NOT NULL,
    blocked_user_id  NUMBER NOT NULL,
    created_at       TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,

    CONSTRAINT pk_murm_user_block PRIMARY KEY (blocker_user_id, blocked_user_id),
    CONSTRAINT fk_murm_user_block_blocker FOREIGN KEY (blocker_user_id) REFERENCES murm_user (id),
    CONSTRAINT fk_murm_user_block_blocked FOREIGN KEY (blocked_user_id) REFERENCES murm_user (id),
    CONSTRAINT ck_murm_user_block_users CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX ix_murm_user_block_blocked
    ON murm_user_block (blocked_user_id, blocker_user_id);
