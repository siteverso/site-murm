ALTER TABLE murm_direct ADD updated_at TIMESTAMP;

UPDATE murm_direct
   SET updated_at = created_at
 WHERE updated_at IS NULL;

ALTER TABLE murm_direct MODIFY updated_at DEFAULT SYSTIMESTAMP NOT NULL;
