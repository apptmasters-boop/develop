# ApptMasters v2.0 — Feature Map

> **v2.0 monorepo** · Repository: `apptmasters-boop/develop` (branch: `main`)
> Stack: Turborepo · Next.js 14 App Router · next-auth v4 (JWT) · Fastify · Drizzle ORM · PostgreSQL · TypeScript

---

## Phase 1 — Auth & Onboarding
- Sign up / Sign in (CredentialsProvider → Fastify `POST /api/auth/login`)
- JWT stored in session, passed as `Bearer` token to all API calls
- Create apartment (name → generates 8-char invite code)
- Join apartment via invite code
- Redirect to `/home` after onboarding

## Phase 2 — Chores
- Create chore (name, room, due date, points, assignment mode)
- Assignment modes: rotating, fixed, voluntary
- Mark complete with optional photo upload
- Chore swap requests (request ↔ accept/decline)
- Status: pending / completed / overdue / swapped
- Workload leaderboard (points per member over 30 days)
- Chore templates — admin creates recurring schedules (frequency in days, auto-generates next chore)
- Overdue auto-detection automation

## Phase 3 — Finance
- Add expense (description, amount, category, split method)
- Split methods: equal, custom, percentage, single-payer
- Expense splits tracked per member
- Settle up flow (confirm from both sides)
- Recurring expenses (day-of-month, auto-reminded)
- Balance summary per member (net owed/owed-to)

## Phase 4 — Maintenance
- Report issue (description, urgency, room, photos)
- Status progression: Reported → ContactedLandlord → InProgress → Resolved → Closed
- Log each landlord contact (method, summary, promise made, date)
- Maintenance history per issue (change log with notes)

## Phase 4b — Notifications
- In-app notification bell with unread count
- Notification types: chore_reminder, chore_overdue, chore_nudge, expense_added,
  settle_up_reminder, low_stock, rent_due, maintenance_followup, weekly_summary,
  house_rule_vote, dispute_raised
- Per-user notification preferences (toggle each type, quiet hours, settle threshold)
- Nudge a roommate about their chore

## Phase 5 — Collaboration
- **Activity Feed** — manual posts + auto-posts for chore completions, expense adds, etc.
- **House Rules** — propose rules, vote yes/no, auto-pass on unanimous vote, admin force-pass/reject
- **Calendar** — shared events with start/end time, all-day toggle, grouped by month
- **Grocery List** — add items with quantity, check/uncheck (toggle), clear checked, per-item delete

## Phase 6 — Communications
- **Group Chat** (`/chat/group`) — shared message thread for all roommates, 3-second polling, bubble UI
- **Direct Messages** (`/chat/dm/[userId]`) — private per-person conversations
- **Messaging Hub** (`/chat`) — shows group chat with last message + all roommates for DM
- **Call Signaling API** — WebRTC offer/answer/ICE exchange via REST (`/api/comms/call`)
  - Initiate call, poll for incoming, PATCH to answer or add ICE candidates, end call

## Phase 7 — Inventory / Supplies
- Track household supplies by category (food, cleaning, toiletries, kitchen, laundry, other)
- Per-item: quantity, unit, low-stock threshold, expiry date, photo
- +/− quantity adjustment buttons
- Alerts section: expired items, expiring within 7 days, low-stock items
- Full CRUD + delta-adjust endpoint

## Phase 8 — Disputes, Audit & Move-out
- **Disputes** — raise a dispute (title, description, optional target roommate, evidence URLs)
  - Admin can mark in_review → resolved (with resolution note) or dismissed
  - All admin actions written to audit log
- **Audit Log** — admin-only chronological record of all admin actions (entity, action, metadata, who, when)
- **Move-out Checklist** — auto-generated from apartment rooms + 12 standard cleaning items
  - Per-item status: pending / ok / needs_repair / missing
  - Progress bar (% complete)
  - Schedule date + notes for landlord
  - Submit to admin when all items checked

## Phase 9 — Polish & Admin
- **Admin Panel** (`/admin`, admin-only):
  - Automations tab — run all automations on demand, see results (overdue marked / reminders sent / chores generated), send weekly summary
  - Audit Log tab — full chronological history
  - Chore Templates tab — create/remove recurring chore schedules
- **Settings** — Admin Panel link shown conditionally for admins
- **User Profile** — edit name, avatar URL, color, dietary flags (vegan, vegetarian, gluten-free, dairy-free, nut-free, halal, kosher)
- **Rooms management** — admin add/remove rooms
- **Members management** — admin remove member, transfer admin role

---

## Data Model Summary (Drizzle / PostgreSQL)

| Table | Description |
|---|---|
| users | Auth credentials, avatar, color, created_at |
| apartments | Name, invite code, admin |
| apartment_members | User↔apartment join with role, move-in date, vacation mode, dietary flags |
| rooms | Name, type enum, status enum |
| chores | Assignment, due date, status, points, photo |
| chore_swap_requests | Requester, target, accepted flag |
| chore_templates | Recurring schedule (frequency_days, assignment_mode) |
| expenses | Amount (cents), category, split method, recurring flag |
| expense_splits | Per-user split amounts, settled flag |
| recurring_expenses | Day-of-month, participants array |
| settlements | From/to user, dual confirmation |
| maintenance_issues | Urgency, status, photos array |
| maintenance_logs | Status change history with notes |
| landlord_contacts | Contact method, summary, promise |
| notifications | Type enum, read flag, reference_id |
| notification_preferences | Per-user toggles, quiet hours |
| feed_posts | Type enum, content, reference_id |
| house_rules | Content, status enum |
| house_rule_votes | Boolean vote per user per rule |
| calendar_events | Start/end timestamps, all_day flag |
| grocery_items | Name, quantity, checked flag, checked_by |
| messages | from/to users (null to_user = group), content, image_url |
| call_sessions | Initiator/receiver, type, status, offer, answer, ICE arrays |
| inventory_items | Name, category, quantity, unit, low_stock_threshold, expires_at |
| disputes | Title, description, status enum, resolution |
| audit_log | Action, entity, entity_id, metadata JSON |
| move_out_checklists | Scheduled date, notes, submitted flag |
| move_out_checklist_items | Label, status enum, photo, room reference |

---

## API Surface (Fastify server on port 4000)

| Prefix | Routes |
|---|---|
| `/api/auth` | POST /register, POST /login |
| `/api/users` | GET /me, PATCH /me |
| `/api/apartment` | GET /, POST /, GET /members, DELETE /members/:userId, PATCH /members/:userId/role |
| `/api/rooms` | GET /, POST /, PATCH /:id, DELETE /:id |
| `/api/chores` | Full CRUD + /workload, /swap-request, /swap-accept |
| `/api/finances` | Expenses CRUD + /balance, /settlements, /recurring |
| `/api/maintenance` | Issues CRUD + /logs, /landlord-contacts |
| `/api/notifications` | GET /, GET /count, PATCH /:id/read, POST /read-all, GET+PATCH /preferences, POST /nudge/:choreId |
| `/api/automations` | POST /run, POST /weekly-summary, GET+POST+DELETE /templates |
| `/api/feed` | GET /, POST /, DELETE /:id |
| `/api/rules` | GET /, POST /, POST /:id/vote, PATCH /:id |
| `/api/calendar` | GET /, POST /, PATCH /:id, DELETE /:id |
| `/api/grocery` | GET /, POST /, PATCH /:id/check, DELETE /:id, DELETE /clear-checked |
| `/api/comms` | GET+POST /messages, GET+POST /dm/:userId, POST /call, GET /call/incoming, GET+PATCH /call/:id |
| `/api/inventory` | GET /, POST /, PATCH /:id, PATCH /:id/adjust, DELETE /:id |
| `/api/disputes` | GET /, POST /, PATCH /:id |
| `/api/audit` | GET / (admin only) |
| `/api/move-out` | GET /, PATCH /, PATCH /item/:itemId |
