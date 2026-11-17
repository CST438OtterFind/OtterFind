-- Reconciles the V4 item_listings table with authenticated pin-saving (the ItemListing entity +
-- ListingService). V4 is already applied and Flyway-immutable, so these changes live here. See
-- docs/erd.md and PRD-5. Runs on Postgres (Supabase) and H2 (tests).

-- Sign-in isn't built yet, so any existing rows are throwaway test data from the earlier endpoint and
-- may not satisfy the constraints below (no owner, null building). Clear them first; the e2e seed
-- (db/e2e) re-populates valid rows under the e2e profile, and Supabase simply starts empty.
DELETE FROM item_listings;

-- A pin belongs to a signed-in user; deleting the user removes their listings.
ALTER TABLE item_listings
    ADD CONSTRAINT fk_item_listings_owner FOREIGN KEY (owner_id)
    REFERENCES users (id) ON DELETE CASCADE;

-- The app validates categories against the ListingCategory enum, which uses a different vocabulary
-- than V4's DB check (PET/ELECTRONICS/... vs PHONE/LAPTOP/...), so drop the DB check.
ALTER TABLE item_listings DROP CONSTRAINT item_category_check;

-- The pin-saving model never sets `color`; a default keeps V4's NOT NULL column satisfied.
ALTER TABLE item_listings ALTER COLUMN color SET DEFAULT '';

-- A listing's description is optional in the model (blank is stored as none), so allow null.
ALTER TABLE item_listings ALTER COLUMN description DROP NOT NULL;

-- Every listing is anchored to a building and records when the item was last seen.
ALTER TABLE item_listings ALTER COLUMN last_seen_at SET NOT NULL;
ALTER TABLE item_listings ALTER COLUMN building_id SET NOT NULL;
