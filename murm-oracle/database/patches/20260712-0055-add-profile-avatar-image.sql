ALTER TABLE murm_user ADD (
    avatar_image BLOB,
    avatar_mime_type VARCHAR2(50),
    avatar_updated_at TIMESTAMP(6)
);
