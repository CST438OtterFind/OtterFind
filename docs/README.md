# Project 03: Ship a Product

## Motivation and Description

In Project 02 you designed, tested, containerized and deployed a REST API. Project 03 treats
everything you learned there as the **floor**, not the goal. You will build a product your team
wants to exist: a **Spring Boot API** plus a **React Native (Expo)** client that runs on the
**web and Android** from one codebase, with sign-in through **two OAuth providers**.

The rigor in this project comes from **depth, not size**. A small product that is well defined,
tested end to end, secured, released and runnable by a stranger scores better than a large one
that only works on one laptop. Four things are new compared to Project 02, and they are the point:

1. **You define the product before you build it.** A one-page product requirements document
   (PRD) with testable acceptance criteria, committed before the proposal presentation. The final is graded against it.
2. **Your system is tested the way a user uses it.** One Playwright test walks your vertical slice
   through the real web client and the real API in CI.
3. **You operate what you ship.** Tagged releases, a runbook, a rotating merge captain, and a
   scenario you did not rehearse at the dry run.
4. **Someone else has to be able to run it.** Another team clones your repo and tries to get it
   running from your README alone.

**Teams are new for Project 03.** Your instructor assigns them; do not assume you will be with
your Project 02 team.

---

## Table of Contents

1. [Schedule](#schedule)
2. [Teams, Repos, and Hosting](#teams-repos-and-hosting)
3. [What You Build](#what-you-build)
4. [Technology](#technology)
5. [Authentication](#authentication)
6. [Carry-Forward Floor from Project 02](#carry-forward-floor-from-project-02)
7. [Design and Documentation](#design-and-documentation)
8. [Testing](#testing)
9. [Security](#security)
10. [Releases and Operations](#releases-and-operations)
11. [Agile Process and the Merge Captain](#agile-process-and-the-merge-captain)
12. [Cross-Team Check-ins and the Onboarding Test](#cross-team-check-ins-and-the-onboarding-test)
13. [Dry Run, Scenario Cards, and Final Presentation](#dry-run-scenario-cards-and-final-presentation)
14. [Individual Accountability](#individual-accountability)
15. [Grading: Final Submission Rubric](#grading-final-submission-rubric)
16. Appendices: [I. Authentication](appendix_i_auth.md) · [II. Testing resources](#appendix-ii-testing-resources) · [III. Sample project](#appendix-iii-sample-project)

---

## Milestones

Dates and point values live in **Canvas**, not in this guide. In order:

1. **Init meeting:** new teams form and pick a product.
2. **GROUP proposal presentation:** what the team is building; `docs/prd.md` committed before class.
3. **Sprints 1–4**, each ending with a PR report (the day before the meeting) and an agile meeting.
   * End of Sprint 2: the last point to switch to an auth broker.
   * Mid-project: **cross-team check-in 1**, the [onboarding test](#check-in-1-onboarding-test).
   * End of Sprint 3: team quiz #1.
   * After Sprint 3: **cross-team check-in 2**, a code review of the paired team plus a follow-up on
     its `onboarding` issues.
4. **Dry run:** scenario card and PR walkthroughs.
5. **Final Submission:** the tagged release URL, before the final presentation.
6. **Final presentation:** team quiz #2.

**PR reports follow the Project 02 review-window rule.** The PR is opened early enough to leave
the team the full review window before the merge deadline (both times are in Canvas). A PR opened
late loses the review-window credit; a requested reviewer who never reviews loses the reviewer
credit.

---

## Teams, Repos, and Hosting

### Your team's GitHub organization

* One teammate creates a **free GitHub organization** for the team and invites everyone else as
  owners. Create your repo(s) inside it.
* Repos are **public**. That gives you free secret-scanning push protection, Dependabot and CodeQL,
  and it lets the instructor, TAs and the team that runs your onboarding test read your work
  without being invited. Do not invite the instructor unless asked.
* **Never create team repos in `CST-438-projects`.** That organization holds course materials
  only.
* A **monorepo** (`api/`, `app/`, `docs/`, plus `compose.yml` at the root) is recommended. It makes
  `docker compose up`, CI and the onboarding test simpler. Two repos are allowed if you keep the
  `docs/` folder in one place and link it from the other.
* Turn on branch protection for `main` before the first PR: pull requests required, required approvals,
  required status checks.

### Hosting: free tiers only

Nobody pays for anything in this project.

| Piece | Suggested free option |
|---|---|
| API (Docker image) | Render free web service (spins down when idle; expect a ~1 minute cold start) |
| Web client | `npx expo export --platform web`, deployed as a Render static site, Netlify, or GitHub Pages |
| Database | Supabase or Neon free Postgres (Render's free Postgres expires after 30 days; avoid it) |
| Android | A local development build on your own laptop (see [Appendix I, section 5](appendix_i_auth.md#5-development-builds-on-a-free-tier-the-real-numbers)) |

A separate staging environment is **not** required. Releases and rollback (below) are.

---

## What You Build

A web-and-mobile product that solves a problem your team cares about. It must support users,
at least two other resource types, and meaningful relationships between them.

### The PRD comes first

A **product requirements document (PRD)** says *what* you are building and *why*, before anyone
decides *how*. It names who the product is for, the problem it solves for them, how you will know
it worked, and exactly what is in and out of scope. It does not describe classes, tables or
frameworks; those belong in `docs/architecture.md` and your ADRs. In industry, a product manager
writes the PRD and the engineers build against it. In this project your team plays both roles,
and the PRD is the contract your Final Submission is graded against.

The test of a good PRD: a stranger could read it and tell you which features count as done. Every
user story ends in **acceptance criteria** written as *Given / When / Then*, for example: *Given I
am signed in, when I book a room that is already booked for that hour, then I see "That room is
taken" and no booking is created.* If you cannot write a test for a criterion, rewrite it until
you can.

Copy the [PRD template](prd_template.md) to `docs/prd.md` and commit it **before the group
proposal presentation**. It is one page with five sections: **users, problem, success measures,
scope (MVP, vertical slice, not building), and user stories with Given/When/Then acceptance
criteria.** After the presentation, change it only through pull requests.

### MVP and vertical slice

* **Account baseline (every team):** sign in with GitHub and Google, update profile, delete
  account (deleting removes the user's data).
* **Product MVP (your team):** the smallest set of stories from your PRD that makes *this*
  product useful.
* **Vertical slice:** one MVP story built and polished end to end, from database table to screen,
  on web and Android. It is what your Playwright test walks and what you demo first.

### Every member owns a vertical slice of work

Nobody is "the front-end person." Each member owns features from the entity and migration,
through the route and its tests, to the screen that uses it.

---

## Technology

### Back end (required)

* **Spring Boot** with **Gradle**, Java or Kotlin. The API is an **OAuth2 Resource Server**
  (see [Authentication](#authentication)).
* REST, documented by a hand-written `openapi.yaml` and SpringDoc, as in Project 02.
* Postgres on a hosted free tier. Supabase or Firebase may host the **database only**, never the
  endpoints.
* **CORS is back.** Project 02's Android client did not need it; a browser client on a different
  origin from your API does. Configure it in Spring Security (Appendix I, section 3.4).

### Front end (required)

* **React Native with Expo**, TypeScript, one codebase.
* **Web** and **Android** are required. **iOS is optional** (a free simulator build on a Mac is
  fine; a physical iPhone requires a paid Apple account and earns nothing extra).
* **Expo Go cannot do this project's sign-in.** You need a development build, which is free for
  Android. See [Appendix I, section 5](appendix_i_auth.md#5-development-builds-on-a-free-tier-the-real-numbers).
* Both platforms call the same API through one client module generated from or written against
  your `openapi.yaml`. "Consistent UI across platforms" means the same features and the same API
  contract on both, not pixel-identical screens.

### Docker

* The API ships as a multi-stage Docker image, as in Project 02.
* `docker compose up` brings up the API and a local Postgres for development and for CI.

---

## Authentication

Read **[Appendix I](appendix_i_auth.md)** before Sprint 1. The short version:

* **Two providers: GitHub and Google.** GitHub first (web, Sprint 1), then Google (web and Android,
  Sprint 2).
* **Backend token exchange.** The client does Authorization Code + PKCE with the provider and posts
  the result to `POST /auth/github` or `POST /auth/google`. The API finishes the exchange (client
  secrets live only on the server), verifies the identity, and issues **its own short-lived JWT**.
  Every other endpoint validates that JWT as a Resource Server, exactly like Project 02.
* **Do not** make Spring Boot an OAuth2 *client* with a login page and a session. That is the old
  appendix, and it does not work for a native app.
* **Required email rule:** reject unverified emails; if a verified email is already registered
  through the other provider, return 409 and name that provider.
* **Stretch goal (ungraded): account linking.** One person, both providers, one account. Only on
  verified emails. Appendix I, section 3.5.
* **Brokers are an escape hatch, not a shortcut.** Supabase Auth, Auth0, Firebase Auth or Clerk may
  replace your own `/auth/*` endpoints **only after Sprint 2** and only if both providers still do
  not work. A team that uses a broker is capped at **1 of 3** on the *OAuth2 sign-in* rubric row.
  The other auth rows are graded normally.
* An **admin** role lives in your database and is enforced on the server.

---

## Carry-Forward Floor from Project 02

These were graded in detail in Project 02. In Project 03 they are expected from Sprint 1 and worth
a small number of points as a gate. Missing them costs more elsewhere, because the rest of the
rubric assumes they exist.

* `openapi.yaml`, an ERD and an error model (RFC 9457 Problem Details) committed **before** the
  controllers that implement them (commit dates are checked).
* Multi-stage `Dockerfile`, `.dockerignore`, and `docker compose up` for the local stack.
* CI runs the tests and builds the image on every PR as a **required check**; JaCoCo enforces a
  70 percent floor on the service layer.
* REST Assured integration tests on Testcontainers covering happy path, 400, 401, 403 and 404.
* **Gate:** a committed credential, or a secret baked into an image, scores 0 on the floor row and
  on both Security and Operations rows.

---

## Design and Documentation

All of this lives in `docs/` in your repo.

| File | What it contains | Due |
|---|---|---|
| `docs/prd.md` | The PRD ([template](prd_template.md)) | Before the proposal presentation |
| `docs/architecture.md` | Context and container diagrams (C4 levels 1–2; Mermaid is fine) showing the API, web client, Android client, database and both providers | Sprint 1 |
| `docs/adr/` | **Three ADRs** ([template](adr_template.md)), and **one of them superseded** by a later ADR. Good candidates: how e2e tests authenticate (forced by the Playwright requirement), web token storage, release/deploy strategy, broker or not | Sprints 1–4 |
| `docs/security.md` | The threat model (see [Security](#security)) | Sprint 2 |
| `docs/runbook.md` | Deploy, roll back, rotate a secret, find logs, DB unreachable | Sprint 3 |
| `docs/captains.md` | Merge captain rotation ([template](captains_template.md); see [the merge captain and deputy](#the-merge-captain-and-deputy)) | Sprint 1 |
| `docs/team_agreement.md` | Your team's PR deadline, review turnaround and channel ([template](team_agreement_template.md); see [the team agreement](#the-team-agreement)) | Sprint 1 |
| `docs/retro/` | One short retro per sprint with planned-versus-done numbers | Each sprint |
| `docs/demo.md` | Your demo script for the final presentation | Sprint 4 |
| `README.md` | What it is, how to run it locally from a fresh clone, how to run the tests, live URLs | Always current |

An **architecture decision record (ADR)** is a short file that records one significant technical
decision: the context, the options, what you chose, and its consequences. Write it when you decide,
so the reasoning survives after the people who made the decision have forgotten it.

A superseded ADR is not a mistake; it is evidence that you revisited a decision. Its replacement
must be dated later and reference the code PR that made the change.

Public classes and methods carry Javadoc/KDoc (API) or TSDoc (client). Swagger UI is live on the
deployed API.

---

## Testing

| Layer | Requirement |
|---|---|
| API unit tests | JUnit 5 on services and validators: decisions, edge cases and rejections, not getters |
| API integration | REST Assured + Testcontainers (the floor), **plus an ownership test for every owned resource**: user A requests user B's resource and gets 403 or 404 |
| Client unit tests | Jest on client logic (API module, hooks, token store, validation), with a coverage threshold set in `jest.config` |
| End to end | **One Playwright test of the vertical slice**, running in CI against `docker compose up` (API + Postgres) and the web client |
| Accessibility | `@axe-core/playwright` in the same e2e test: **zero serious violations** on the vertical-slice pages |

Playwright cannot log in to GitHub or Google in CI, and you should not try. Appendix I, section 6,
shows the pattern: a test-only Spring profile that mints your own JWT for a seeded user, which is
never active in production, plus a test proving it is absent from the production context. Write
that choice up as an ADR.

Postman collections are not required.

---

## Security

* **Ownership (IDOR) tests** for every owned resource, as above.
* `docs/security.md`: **five threats**, each with its mitigation and a **link to the test, config
  or workflow that implements it**. Required: cross-user access, token theft or replay, secret
  leakage, vulnerable dependencies, destructive admin action. STRIDE headings are enough.
* **gitleaks** runs on every PR.
* **Dependabot** is configured for Gradle and npm (cap it with `open-pull-requests-limit`), and at
  least one Dependabot PR is reviewed and merged during the project.
* Secret-scanning push protection is on (free for public repos).
* Client IDs are public; client secrets live only in the API's environment (Render environment
  variables, GitHub Actions secrets). Anything named `EXPO_PUBLIC_*` ships to every user.

---

## Releases and Operations

* Production deploys **only from a tagged GitHub Release**: one per sprint at minimum
  (`v0.1.0`, `v0.2.0`, ...), cut by that sprint's merge captain, with release notes generated from
  the merged PRs.
* `/actuator/health` is live on the deployed API.
* `docs/runbook.md` covers: how to deploy, **how to roll back to the previous release**, how to
  rotate a secret, where the logs are and what a healthy response looks like, and what to do when
  the database is unreachable.
* Log one line per request with a request ID so a request can be found in the logs.

---

## Agile Process and the Merge Captain

Same as Project 02, plus one role.

* GitHub Project board; issues are user stories with acceptance criteria, **five per member**,
  each linked to its PRD story ID and attached to a sprint milestone.
* All changes reach `main` through pull requests that reference an issue and carry the required
  approvals (two teammates who are not the author; one on a team of three).
* **Merge captain:** one per sprint, rotating. See [the subsection below](#the-merge-captain-and-deputy).
* **Penalties follow the Project 02 ruling.** A PR merged before its approvals costs the **author**
  the approvals point on their PR report and costs the **captain of record** the captain row for
  that sprint. Reviewers are never penalized for a merge they could not review. A merge by anyone
  other than the captain or deputy also costs the captain row.
* **Sprint retros** in `docs/retro/` record planned versus done (stories and sizes), what carried
  over, and one change for the next sprint. Graded on honesty, not velocity.

### The merge captain and deputy

**Why the role exists.** On a real team, `main` is what ships, and someone is accountable for what
goes into it and when. When everyone can click merge, PRs land half-reviewed, two people merge
conflicting work in the same hour, and nobody can say what is in a release. The merge captain is a
lightweight version of the release manager role: one person owns `main` for one sprint.

**The rotation.** Copy the [captains template](captains_template.md) to `docs/captains.md` and
commit it in Sprint 1. It names one **captain** and one **deputy** for each sprint, rotating so every
member is captain at least once. On a team of three, someone is captain twice.

**The captain, during their sprint:**

* is the **only** person who clicks merge (the deputy stands in, below);
* merges nothing without its required approvals and green checks, and does not merge their own PR
  until it has its approvals like anyone else's;
* decides the merge order when PRs conflict, and tells the author when a PR has to wait and why;
* cuts that sprint's tagged release (see [Releases and Operations](#releases-and-operations));
* writes a **merge log** section in **their own PR report** for that sprint: each PR that merged,
  each PR that waited and why, and the release tag. Everyone else's PR report names who the captain
  was.

**The deputy, during the same sprint:**

* merges only when the captain is **out**: the captain said in the team channel that they are
  unavailable, or has not responded within the review window to a PR that is approved and green;
* says so in the PR ("merging as deputy: captain out") so the merge log can record it;
* checks the release notes before the captain cuts the release.

**Enforce it in GitHub.** In the branch protection rule for `main`, turn on **Restrict who can push
to matching branches** and list only that sprint's captain and deputy (merging a PR counts as a
push). Turn on **Do not allow bypassing the above settings** too, or every org owner can still
merge. The outgoing captain updates the list when the sprint changes.

### The team agreement

The course deadlines are the outer limit: your PR is open by **2:00 AM Thursday** and reviewed and
merged by **10:00 AM Thursday**. A team that aims for the last minute leaves the captain nothing to
work with, so each team sets an **earlier** deadline of its own. Copy the
[team agreement template](team_agreement_template.md) to `docs/team_agreement.md` and commit it in
Sprint 1. It records:

* **your team's PR deadline**, earlier than the course deadline (for example, Tuesday 9:00 PM);
* how quickly a requested reviewer responds;
* where the team talks (one channel) and how someone says they are out.

Every PR report links to this file as it stood that sprint (a permalink to a commit, not to
`main`). Missing the team's deadline does not cost points on your PR report; it comes up at the
agile meeting and in teammate reviews. Missing the course deadline, or a PR that never merges, does
cost points. Change the agreement only through a pull request.

---

## Cross-Team Check-ins and the Onboarding Test

Each team visits one team and hosts another for two in-class check-ins. Pairings are posted in Canvas and stay the
same for both check-ins.

### Check-in 1: onboarding test

At check-in 1, part of your team visits while the rest hosts, then you swap. With only
the README and runbook, the visiting team has a short timebox (set in class) to clone your repo, run
`docker compose up`, reach a working local stack, and run your test suite.

* Everything that blocks them goes into your repo as a GitHub issue labeled `onboarding`. If nothing
  blocked them, they file one issue saying so, with the commands they ran.
* Before the Final Submission, your team fixes or answers every `onboarding` issue filed against
  you.
* Both sides are graded: the visitors on the quality of their issues, the hosts on whether a
  stranger could run their project.

### Check-in 2: code review and follow-up

Same pairings. Each student reviews recent pull requests from the team they visited (comment reviews only,
as in Project 2), and the visitors confirm that the `onboarding` issues they filed were fixed or
answered.

---

## Dry Run, Scenario Cards, and Final Presentation

### Dry run (end of Sprint 4)

1. **Demo run-through** against the production URL, with feedback you can still act on.
2. **Scenario card.** You draw one card and perform it live on production. The full deck is
   published here so you can rehearse every card; the only surprise is which one you draw.
   * Show what a user who does **not** own a resource sees when they request it.
   * **Roll back** production to the previous release, then forward again.
   * Show the health endpoint and the **log line** for the request you just made.
   * Revoke a user's **admin** role and show the 403.
   * A secret has leaked: walk through **rotating** it using your runbook.
   * The database is unreachable: show what the user sees and what your runbook says to do.
3. **PR walkthroughs.** Each member is handed one of their own merged PRs and a few minutes to
   explain what it does, why it was built that way, and which test covers it.

### Final presentation

* The demo runs against the **production URL**, starting from a fresh account created live, on web
  and on Android.
* Follow `docs/demo.md`. Lead with the vertical slice.
* Close with a **planned-versus-shipped** slide: each PRD acceptance criterion marked met or not,
  with links to the issues.

---

## Individual Accountability

You can use any tool you like to write code. You must be able to explain the code you submit.

* **Your merged PRs:** substantive, with commits you authored, spread across the sprints.
* **Your reviews:** submitted on teammates' PRs, engaging the code rather than only approving.
* **PR walkthrough** at the dry run (above).
* **Team quiz**, twice (end of Sprint 3 and the final presentation). Each team gets its own short Canvas quiz about its own
  repo: for example, which endpoint paginates, who was merge captain in Sprint 2, what the runbook
  says to do when the database is unreachable, which PR added the ownership tests. Questions are
  drafted from your repo and approved by the instructor before release. If you have been reading
  your teammates' PRs, you will do fine.

---

## Grading: Final Submission Rubric

Submit the URL of your tagged release. Points and the due date are in Canvas, and the importable
rubric is [`rubrics/p3_final_submission_rubric.csv`](rubrics/p3_final_submission_rubric.csv).
**[TEAM]** rows are shared by the team; **[INDIVIDUAL]** rows are graded per student.

| Category | What is graded |
|---|---|
| [TEAM] Carry-forward floor from P2 | Contract-first, Docker/compose, CI with coverage gate, integration tests; credential gate |
| [TEAM] Product definition | PRD before the proposal presentation, acceptance criteria linked from issues, product-specific MVP and not-building list, planned vs shipped |
| [TEAM] Architecture and design | Architecture doc, three ADRs with one superseded, design-review issues answered |
| [TEAM] Implementation | API, web client vertical slice and error states, Android client against the live API |
| [TEAM] Authentication and authorization | OAuth2 sign-in with both providers from both clients (a broker earns reduced credit), ownership, admin role and account deletion |
| [TEAM] Testing | Unit and ownership tests, Playwright e2e with axe in CI, client Jest tests |
| [TEAM] Security and operations | gitleaks, Dependabot and threat model; releases and runbook |
| [TEAM] Process | Merge captain rotation, issues and sprint retros |
| [TEAM] Documentation and onboarding | Onboarding test passed, `onboarding` issues resolved, README, API docs, demo script |
| [TEAM] Dry run and final presentation | Live demo on production with planned vs shipped; scenario card at the dry run |
| [INDIVIDUAL] | Merged PRs, reviews, PR walkthrough, team quiz |

Account linking is a stretch goal and is not graded. The weekly agile meetings, PR reports,
proposal, code review, teammate reviews and retrospective are separate Canvas assignments.

---

## Appendix I: Authentication

See **[appendix_i_auth.md](appendix_i_auth.md)**: why OAuth is hard in React Native, provider
setup, the backend token exchange in Spring Boot, the Expo client code, free development builds,
testing auth in CI, a sprint plan, and a pitfalls checklist.

## Appendix II: Testing resources (thank you, Ahmed!)

* **The example code and notebook Ahmed used:**
  https://github.com/AhmedTurkiii/software-testing/blob/main/Software-Testing.ipynb

* **AAA pattern (Arrange, Act, Assert):**
  https://semaphore.io/blog/aaa-pattern-test-automation
* **Setup and teardown in Jest:** https://jestjs.io/docs/setup-teardown
* **Playwright: getting started and authentication:** https://playwright.dev/docs/intro ·
  https://playwright.dev/docs/auth
* **axe-core for Playwright:** https://playwright.dev/docs/accessibility-testing
* **Testing Expo / React Native with Jest:** https://docs.expo.dev/develop/unit-testing/
* **Spring Security test support for JWTs:**
  https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/oauth2.html
* **Writing a PRD** (background reading; use the course [template](prd_template.md)):
  https://www.atlassian.com/agile/product-management/requirements

## Appendix III: Sample project

### Campus Resource Booking

A platform where students browse, reserve and manage campus resources such as study rooms, lab
equipment and tutoring sessions. Web and Android from one Expo codebase.

* **PRD in one line:** first-year students cannot tell which study rooms are free right now;
  success means a student books a room in under a minute.
* **Vertical slice:** search for an available room and book it.

| Member | Owns | Tests |
|---|---|---|
| 1. Auth and accounts | GitHub and Google sign-in, `/auth/*`, profiles, roles, delete account | Token service and email rule unit tests; 401/403 integration tests |
| 2. Resources and search | CRUD for resources, search and filters, admin screens | Search and filter unit tests; ownership tests on admin routes |
| 3. Booking | Create and cancel bookings, availability, conflict detection | Conflict-detection unit tests; the Playwright vertical-slice test |
| 4. Notifications and ops | Booking reminders, usage dashboard, release workflow, runbook | Reminder scheduling tests; gitleaks and Dependabot setup |

---

## Changelog

* **FA26 (2026-10-13):** rewritten for rigor. React Native (Expo) web + Android client; new teams;
  team-owned public GitHub orgs; free-tier hosting; PRD template; backend token exchange replaces
  the old Spring OAuth2-client appendix; account linking is a stretch goal; brokers cost points;
  Playwright e2e with axe; ownership tests and threat model; tagged releases and runbook; merge
  captain; onboarding test; scenario cards at the dry run; team quiz twice; 100-point Final
  Submission rubric. Removed: the 8-endpoint count, Postman, the generic MVP.
