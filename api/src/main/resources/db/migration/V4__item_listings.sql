
CREATE TABLE item_listings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    building_id BIGINT REFERENCES buildings(id),
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL,
    color VARCHAR(50) NOT NULL,
    listing_type VARCHAR(10) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,

    floor INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT item_category_check CHECK (
        category IN (
            'PHONE', 'LAPTOP', 'WALLET',
            'PETS', 'BACKPACK', 'CHARGER',
            'PERSONAL_ITEM', 'MISC'
        )
    ),

    CONSTRAINT listing_type_check CHECK (
        listing_type IN ('LOST', 'FOUND')
    ),

    CONSTRAINT listing_status_check CHECK (
        status IN ('ACTIVE', 'RESOLVED')
    ),

    CONSTRAINT coordinates_check CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR
        (
            latitude BETWEEN -90 AND 90
            AND longitude BETWEEN -180 AND 180
        )
    )
);

CREATE INDEX idx_item_listings_owner ON item_listings(owner_id);

CREATE INDEX idx_item_listings_building ON item_listings(building_id);

CREATE INDEX idx_item_listings_category ON item_listings(category);

CREATE INDEX idx_item_listings_created ON item_listings(created_at);
