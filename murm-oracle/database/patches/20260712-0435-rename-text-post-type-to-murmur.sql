BEGIN
    EXECUTE IMMEDIATE
        'ALTER TABLE murm_post DROP CONSTRAINT ck_murm_post_type';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE <> -2443 THEN
            RAISE;
        END IF;
END;
/

UPDATE murm_post
   SET post_type =
       CASE LOWER(TRIM(post_type))
           WHEN 'text'    THEN 'murmur'
           WHEN 'murmur'  THEN 'murmur'
           WHEN 'photo'   THEN 'photo'
           WHEN 'comment' THEN 'comment'
           ELSE LOWER(TRIM(post_type))
       END;

COMMIT;

SELECT post_type,
       COUNT(*) AS total
  FROM murm_post
 GROUP BY post_type
 ORDER BY post_type;

ALTER TABLE murm_post
    MODIFY
    (
        post_type DEFAULT 'murmur'
    );

ALTER TABLE murm_post
    ADD CONSTRAINT ck_murm_post_type
    CHECK
    (
        post_type IN
        (
            'murmur',
            'photo',
            'comment'
        )
    );