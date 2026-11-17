-- Test accounts and listings. Flyway only reads this folder under the e2e profile (application-e2e.yaml),
-- so none of this reaches Supabase. It reruns whenever this file changes, and deleting the users first
-- clears their listings too, so a rerun doesn't duplicate anything.
DELETE FROM users WHERE email IN ('e2e-user@example.test', 'e2e-other@example.test');

-- Real GitHub user IDs are numbers, so these provider IDs can't match a real account.
INSERT INTO users (email, display_name, oauth_provider, oauth_provider_user_id) VALUES
    ('e2e-user@example.test', 'Test Otter', 'GITHUB', 'e2e-user'),
    ('e2e-other@example.test', 'Other Otter', 'GITHUB', 'e2e-other');

INSERT INTO item_listings
    (owner_id, building_id, listing_type, category, item_name, description, floor, latitude, longitude, last_seen_at, created_at)
SELECT u.id, b.id, v.listing_type, v.category, v.item_name, v.description, v.floor, v.latitude, v.longitude, now() - v.age, now() - v.age
FROM (VALUES
    ('e2e-user@example.test',  'Library',                         'LOST',  'PET',         'Grey tabby cat',    'Friendly, with a red collar.', 2,    36.65231, -121.79614, INTERVAL '20 minutes'),
    ('e2e-other@example.test', 'Dining Commons',                  'FOUND', 'KEYS',        'Car keys on lanyard', 'Handed in at the front desk.', 1,  36.65421, -121.79886, INTERVAL '3 hours'),
    ('e2e-other@example.test', 'Chapman Science Academic Center', 'LOST',  'ELECTRONICS', 'Silver laptop',     NULL,                           3,    36.65331, -121.79445, INTERVAL '2 days'),
    ('e2e-user@example.test',  'Aquatic Center',                  'FOUND', 'CLOTHING',    'Blue swim jacket',  NULL,                           NULL, 36.65151, -121.80742, INTERVAL '5 days'),
    ('e2e-other@example.test', 'Business Information and Technology', 'LOST', 'BOOKS',    'Statistics notebook', 'Green cover.',               NULL, 36.65240, -121.79726, INTERVAL '12 days'),
    ('e2e-other@example.test', 'Student Center',                  'LOST',  'OTHER',       'Water bottle, no pin', 'Not sure exactly where.',   NULL, NULL,     NULL,       INTERVAL '40 days')
) AS v(email, building, listing_type, category, item_name, description, floor, latitude, longitude, age)
JOIN users u ON u.email = v.email
JOIN buildings b ON b.name = v.building;
