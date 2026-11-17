-- Lost and found posts, including their map pins. See docs/erd.md.
CREATE TABLE item_listings (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    building_id  BIGINT NOT NULL REFERENCES buildings (id) ON DELETE RESTRICT,
    listing_type VARCHAR(10) NOT NULL CHECK (listing_type IN ('LOST', 'FOUND')),
    category     VARCHAR(30) NOT NULL,
    item_name    VARCHAR(120) NOT NULL,
    description  VARCHAR(2000),
    image_url    VARCHAR(2048),
    floor        INTEGER,
    -- A pin is optional (PRD-5), but it needs both coordinates or neither.
    latitude     DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude    DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    status       VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'RESOLVED')),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);
