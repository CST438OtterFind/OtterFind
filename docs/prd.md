# OtterFind - Requirements

[Back to the Project 03 guide](README.md)

**Team:** `p3_s1_group_07 (Group 7)` · **Repo:** `https://github.com/CST438OtterFind/OtterFind` · **Last updated:** `11/2/26`

---

## 1. Users

- **Primary user:** `a CSUMB student or staff member who has lost something on campus (a pet, a laptop, a notebook, keys)
  and wants people who walk past it to be able to tell them exactly where they saw it.`

- **Secondary user:** `A CSUMB student or staff member that finds a lost item can create a report for it
  with any additional details.`

- **Tertiary user:** `An admin that removes any abusive or fake posts/messages.`

## 2. Problem

Two sentences: what the user struggles with today, and why existing options fall short.

`With the bustle of school life, it's not unheard of to leave
something behind in a classroom by accident. 
Currently, there are very limited options for a "lost and found" system,
since not everything valuable on your person is able to be tracked.`

## 3. Success measures

Three measurable signals that would show the product works. Each one needs a number and a way to
check it.

| # | Measure                                                                                          | Target                  | How we check it                                                                                                        |
|---|--------------------------------------------------------------------------------------------------|-------------------------|------------------------------------------------------------------------------------------------------------------------|
| S1 | `A new user signs in and posts a lost item with its building and a map pin`                      | `Under 1 minute 30 sec` | `Timed with a visiting student during the onboarding check-in`                                                         |
| S2 | `A user is able to click on a lost item and see its details as well as its location on the map.` | `Under 10 seconds`      | `When clicking on an item, the screen transitions/adds item details to the view without crashing the app.`             |
| S3 | `A user is able to communicate and send a message to someone who has found an item`              | `Under 1 minute`        | `When selecting a report for a lost item, a message function shows up and allows a user to communicate successfully. ` |

## 4. Scope: MVP, vertical slice, and not building

**MVP** is the smallest set of stories that makes *this* product useful. It always includes the
account baseline (sign in with GitHub and Google, update profile, delete account) **plus** the
stories specific to your product.

- **MVP stories:** `PRD-1, PRD-2, PRD-3, PRD-4, PRD-5, PRD-6, PRD-7` (listed in section 5), plus the account baseline: sign in with GitHub and Google, update profile, delete account.
- **Vertical slice:** PRD-4: Post a lost item with where it was last seen, then a second user
   finds it and adds a sighting (PRD-7) the owner can see, on web and Android. This is what the Playwright test
   walks and what the demo opens with.
- **Not building (this term):**
  - Anything beyond the CSUMB campus.
  - An iOS app (we ship web and Android only).
  - Rewards or payments for returning an item.
  - Ownership verification or claim checks for found items.

## 5. User stories and acceptance criteria

One row per MVP story. Each GitHub issue links to its story ID (`PRD-3`) and each story has at
least one acceptance criterion in **Given / When / Then** form that someone outside the team could
test.

| ID    | Story                                                                                                                                      | Acceptance criteria                                                                                                                                                                                                                                                                                                                                           |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PRD-1 | As a user, I want to sign in with GitHub or Google, update my profile, and delete my account so that I control my identity on OtterFind.                       | **Given** I am signed out, **when** I choose "Sign in with Google" or "Sign in with GitHub" and approve, **then** I land on the feed with my name shown. **Given** I am signed in, **when** I change my display name and save, **then** the new name shows on my profile and my posts. **Given** I am signed in, **when** I delete my account and confirm, **then** I am signed out and my profile and posts are removed. |
| PRD-2 | As a staff member who found multiple lost items, I want to see a list of reported lost items so I can try and pinpoint who they belong to. | **Given** `I have an account and am signed in`, **when** `I pull up the map or list of lost items`, **then** `I can then find more details on the lost items.`                                                                                                                                                                                          |
| PRD-3 | As someone who found an item with an unknown owner, I want to be able to report a missing item to try and find the owner.                  | **Given** `I have an account and found a missing item`, **when** `I fill out a Report with details`, **then** `the lost item is posted for other users to see.`                                                                                                                                                                                               |
| PRD-4 | As someone who lost something, I want to post it with where I last saw it so that people know what and where to look.                      | **Given** I am signed in, **when** I post "Grey tabby cat" as Lost, category Pet, building "Library", floor 2, a pin on the map and a last-seen time, **then** it appears at the top of the feed with its building and pin. **Given** a title under 4 characters or no building, **when** I submit, **then** I see which field is wrong and nothing is posted. |
| PRD-5 | As someone who wants to help the person who lost the item, I want to be able to find where the item was last seen and go to that place on the map.             | **Given** I am signed in and a lost item "Grey tabby cat" was posted with building "Library" and a map pin, **when** I open the item and tap "Show on map", **then** the map opens centered on that pin with the building and last-seen time shown. **Given** an item has no map pin, **when** I open it, **then** I see its building only and no "Show on map" button. |
| PRD-6 | As someone who lost or found an item, I want to message the other person in the app so that we can arrange to return it without sharing personal contact info. | **Given** I am signed in and viewing someone else's post, **when** I tap "Message" and send "I think I saw your cat by the library", **then** the conversation appears in both users' inboxes with the post linked. **Given** I am the post owner, **when** I reply, **then** the other user sees my reply in the same conversation. **Given** I am viewing my own post, **then** no "Message" button is shown. |
| PRD-7 | As someone who spotted a lost item, I want to add a sighting with where and when I saw it so that the owner knows where it is now.                             | **Given** I am signed in and viewing "Grey tabby cat", **when** I add a sighting with building "Student Center", a map pin and the time, **then** the sighting appears on the item, newest first, and the owner sees it on their post. **Given** I leave the building empty, **when** I submit, **then** I see which field is wrong and nothing is added. |


---

### Change log

| Date    | PR  | What changed and why                 |
|---------|-----|--------------------------------------|
| `10/29` | `1` | Brandon - added PRD, success target, |
| `11/1`  | `2` | Daniel - updated PRD                 |
| `11/2`  | `4` | Daniel - updated PRD                 |
| `11/2`  | `5` | Tony - updated PRD                   |