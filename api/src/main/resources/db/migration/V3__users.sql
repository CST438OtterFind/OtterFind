CREATE TABLE public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ADMIN')),
    oauth_provider TEXT NOT NULL
        CHECK (oauth_provider IN ('GOOGLE', 'GITHUB')),
    oauth_provider_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_oauth_identity
        UNIQUE (oauth_provider, oauth_provider_user_id)
);