ALTER TABLE murm_user ADD (
    region_code VARCHAR2(2),
    column_group_code VARCHAR2(10) DEFAULT 'sex' NOT NULL
)
;

ALTER TABLE murm_user ADD CONSTRAINT ck_murm_user_region
    CHECK (region_code IN ('N', 'NE', 'CO', 'SE', 'S'))
;

ALTER TABLE murm_user ADD CONSTRAINT ck_murm_user_column_group
    CHECK (column_group_code IN ('sex', 'region'))
;


ALTER TABLE murm_user ADD column_group_code VARCHAR2(10) DEFAULT 'sex' NOT NULL;

ALTER TABLE murm_user ADD CONSTRAINT ck_murm_user_column_group
    CHECK (column_group_code IN ('sex', 'region'));