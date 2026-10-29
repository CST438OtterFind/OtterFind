# OtterFind - Requirements

[Back to the Project 03 guide](README.md)

> Copy this file to `docs/prd.md` in your team repo and replace everything in angle brackets.
> Keep it to **one page**. Commit it **before the group proposal presentation**; the commit date is checked.
> After the presentation, change it only through pull requests, so the history shows what changed and why.
> Your Final Submission is graded against this document.

**Team:** `p3_s1_group_07 (Group 7)` · **Repo:** `https://github.com/CST438OtterFind/OtterFind` · **Last updated:** `10/29/26`

---

## 1. Users

- **Primary user:** `a CSUMB student who has lost something on campus (a pet, a laptop, a notebook, keys)
  and wants people who walk past it to be able to tell them exactly where they saw it.`

- **Secondary user (optional):** `<for example, an admin>`

## 2. Problem

Two sentences: what the user struggles with today, and why existing options fall short.

`<problem statement>`

## 3. Success measures

Three measurable signals that would show the product works. Each one needs a number and a way to
check it.

| # | Measure | Target                  | How we check it |
|---|---|-------------------------|---|
| S1 | `A new user signs in and posts a lost item with its building and a map pin` | `Under 1 minute 30 sec` | `Timed with a visiting student during the onboarding check-in` |
| S2 | |                         | |
| S3 | |                         | |

## 4. Scope: MVP, vertical slice, and not building

**MVP** is the smallest set of stories that makes *this* product useful. It always includes the
account baseline (sign in with GitHub and Google, update profile, delete account) **plus** the
stories specific to your product.

- **MVP stories:** `<PRD-1, PRD-2, ...>` (listed in section 5)
- **Vertical slice:** `<the one MVP story you will polish end to end and test with Playwright>`
-  PRD-4: Post a lost item with where it was last seen, then a second user
   finds it and adds a sighting the owner can see, on web and Android. This is what the Playwright test
   walks and what the demo opens with.
- **Not building (this term):** `<at least three things a reader might expect that you are deliberately leaving out>`

## 5. User stories and acceptance criteria

One row per MVP story. Each GitHub issue links to its story ID (`PRD-3`) and each story has at
least one acceptance criterion in **Given / When / Then** form that someone outside the team could
test.

| ID    | Story                                                                                                                 | Acceptance criteria |
|-------|-----------------------------------------------------------------------------------------------------------------------|---|
| PRD-1 | As a `<user>`, I want to `<action>` so that `<benefit>`.                                                              | **Given** `<state>`, **when** `<action>`, **then** `<observable result>`. |
| PRD-2 |                                                                                                                       | |
| PRD-3 |                                                                                                                       | |
| PRD-4 | As someone who lost something, I want to post it with where I last saw it so that people know what and where to look. | **Given** I am signed in, **when** I post "Grey tabby cat" as Lost, category Pet, building "Library", floor 2, a pin on the map and a last-seen time, **then** it appears at the top of the feed with its building and pin. **Given** a title under 4 characters or no building, **when** I submit, **then** I see which field is wrong and nothing is posted. |
| PRD-5 |                                                                                                                       ||


---

### Change log

| Date    | PR  | What changed and why                       |
|---------|-----|--------------------------------------------|
| `10/28` | `1` | Initial version - No change, only template |
| `10/29` | `2` | Brandon - added PRD, success target,       |
| `date`  | `x` |                                            |