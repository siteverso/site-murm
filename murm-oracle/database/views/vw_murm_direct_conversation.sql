CREATE OR REPLACE VIEW vw_murm_direct_conversation AS
WITH participants AS
    (SELECT sender_user_id AS user_id,
         recipient_user_id AS other_user_id,
         id,
         contents,
         created_at,
         0 AS unread
     FROM murm_direct
     UNION ALL
     SELECT recipient_user_id AS user_id,
         sender_user_id AS other_user_id,
         id,
         contents,
         created_at,
         CASE WHEN read_at IS NULL THEN 1 ELSE 0 END AS unread
     FROM murm_direct),
    ranked AS
        (SELECT p.*,
             row_number() OVER
                 (
                 PARTITION BY user_id, other_user_id
                 ORDER BY created_at DESC, id DESC
                 ) AS rn,
             sum(unread) OVER
                 (
                 PARTITION BY user_id, other_user_id
                 ) AS unread_count
         FROM participants p)
SELECT r.user_id,
    r.other_user_id,
    u.username,
    r.contents AS last_message,
    r.created_at AS last_at,
    r.unread_count
FROM ranked r
JOIN murm_user u
     ON u.id = r.other_user_id
WHERE r.rn = 1;
