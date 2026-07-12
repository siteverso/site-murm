-- Substitui região brasileira por país internacional na conta do usuário.
ALTER TABLE murm_user ADD (
    country_code VARCHAR2(2),
    country_name VARCHAR2(160),
    country_calling_code VARCHAR2(12)
);

ALTER TABLE murm_user ADD CONSTRAINT ck_murm_user_country_code
    CHECK (country_code IS NULL OR REGEXP_LIKE(country_code, '^[A-Z]{2}$'));

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE murm_user DROP CONSTRAINT ck_murm_user_region';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -2443 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE murm_user DROP CONSTRAINT ck_murm_user_column_group';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -2443 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE murm_user DROP COLUMN region_code';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -904 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE murm_user DROP COLUMN column_group_code';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -904 THEN RAISE; END IF;
END;
/
