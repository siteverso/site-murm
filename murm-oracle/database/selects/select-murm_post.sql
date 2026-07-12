select * from murm_post;


SELECT
    id,
    created_at,
    CURRENT_TIMESTAMP AS agora,
    created_at + NUMTODSINTERVAL(1, 'MINUTE') AS libera_em,
    ROUND(
        (
            CAST(created_at + NUMTODSINTERVAL(1, 'MINUTE') AS DATE)
            - CAST(CURRENT_TIMESTAMP AS DATE)
        ) * 86400
    ) AS segundos_restantes
FROM murm_post
WHERE user_id = (
    SELECT id
    FROM murm_user
    WHERE LOWER(username) = LOWER('usuario')
)
AND post_type = 'photo'
AND status = 'published'
ORDER BY created_at;