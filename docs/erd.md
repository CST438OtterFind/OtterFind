# Entity relationship diagram

Based on the ERD in `docs/prd.md` (PR #6), with the changes below so the tables can hold what the
user stories require. **Only `BUILDING` (`V2__buildings.sql`) and `USER` (`V3__users.sql`) exist so
far.** The rest is the plan, and each table gets its migration when its story is built.

```mermaid
erDiagram
    USER ||--o{ IDENTITY : "signs in with"
    USER ||--o{ ITEM_LISTING : posts
    USER ||--o{ SIGHTING : reports
    BUILDING ||--o{ ITEM_LISTING : "last seen in"
    BUILDING ||--o{ SIGHTING : "seen in"
    ITEM_LISTING ||--o{ SIGHTING : has
    ITEM_LISTING ||--o{ CONVERSATION : discusses
    USER ||--o{ CONVERSATION : starts
    CONVERSATION ||--o{ MESSAGE : contains
    USER ||--o{ MESSAGE : sends

    USER {
        long id PK
        string email UK
        string display_name
        string role
        datetime created_at
    }

    IDENTITY {
        long id PK
        long user_id FK
        string provider
        string provider_user_id
        datetime created_at
    }

    BUILDING {
        long id PK
        string name UK
        double latitude
        double longitude
    }

    ITEM_LISTING {
        long id PK
        long owner_id FK
        long building_id FK
        string category
        string listing_type
        string item_name
        string description
        string image_url
        int floor
        double latitude "optional, see PRD-5"
        double longitude "optional, see PRD-5"
        string status
        datetime last_seen_at
        datetime created_at
    }

    SIGHTING {
        long id PK
        long item_listing_id FK
        long reporter_id FK
        long building_id FK
        int floor
        double latitude
        double longitude
        string note
        datetime seen_at
        datetime created_at
    }

    CONVERSATION {
        long id PK
        long item_listing_id FK "unique together with requester_id"
        long requester_id FK "the person asking, never the poster"
        datetime created_at
    }

    MESSAGE {
        long id PK
        long conversation_id FK
        long sender_id FK "the requester or the item's poster"
        string text "1 to 1000 characters after trimming"
        string image_url "optional, once uploads exist"
        datetime sent_at
    }
```

## Changes from the PRD's ERD

| Change | Why |
|---|---|
| Added `BUILDING`, and `ITEM_LISTING.building_id` replaces `location_label` | PRD-4 and PRD-7 require a building, and the picker needs a fixed list |
| Added `SIGHTING` | PRD-7 and the vertical slice can't be stored without it |
| Added `ITEM_LISTING.floor` and `last_seen_at` | PRD-4 posts a floor and a last-seen time |
| Added `IDENTITY` | Appendix I, section 3.5: one row per provider login, keyed by provider ID and never by email |
| `latitude` and `longitude` are `double` and optional on `ITEM_LISTING` | PRD-5 covers an item with no map pin. Store both or neither |
| `CONVERSATION.requester_id` replaces `CONVERSATION_PARTICIPANT` | A conversation is always between the person asking and the item's poster, so `requester_id` and the listing's `owner_id` already name both people. That's one less table to keep in step, and `UNIQUE (item_listing_id, requester_id)` stops duplicate conversations |

## When a row is deleted

The course guide says deleting an account removes the user's data, so nothing a user wrote stays
behind.

| Deleted | Also deleted | Blocked? |
|---|---|---|
| `USER` | Their identities, listings and sightings, and every conversation they're in, with its messages | No |
| `ITEM_LISTING` | Its sightings and conversations | No |
| `CONVERSATION` | Its messages | No |
| `BUILDING` | Nothing | Yes, while a listing or sighting uses it |

## Decisions for the team

- **Conversations and messages after account deletion (proposed with PRD-6):** deleting an account
  deletes every conversation that person is in, for both people, instead of leaving the other person
  half a conversation. Each conversation goes with its requester (`requester_id`) or with the item it's
  about (the poster's listings), so cascading deletes cover it with no extra code.
- **`BUILDING` holds outdoor places too:** PRD-4 requires a building, so an item lost on a lawn or in
  a parking lot needs a row like "Main Quad". These aren't seeded yet.
