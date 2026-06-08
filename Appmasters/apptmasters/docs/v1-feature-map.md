# ApptMasters v1 — Feature Map

> **Production app** · Repository: `apptmasters-boop/apptmasters` (branch: `master`)
> Live at: https://apptmasters.com · Server: EC2 `i-01a0910f0778b0231` (100.31.129.115)
> Stack: Next.js · Prisma ORM · PostgreSQL · PM2 · Nginx · Let's Encrypt

---

## Authentication
- Sign up with email + password (bcrypt)
- Sign in with session cookie
- 2FA-ready email via Resend (`apptmasters@gmail.com`)
- Password reset flow
- Profile page — display name, avatar upload (no URL input field)

## Apartment
- Create apartment (generates invite code)
- Join apartment via invite code
- Apartment dashboard (home page)

## Chores
- Create chore (name, room, due date, points)
- Assign chore to a roommate
- Mark chore complete (with optional photo upload)
- Chore swap requests (request ↔ accept/decline)
- Chore status: pending / completed / overdue / swapped
- Workload tracking (points earned per member)

## Finance
- Add expense (description, amount, category, split method)
- Equal or custom expense splits
- Receipt upload (receipt icon badge shown on card)
- Expense date displayed on card
- Settle up (mark a balance as paid)
- Balance summary per member (net owed / owed to you)

## Maintenance
- Report maintenance issue (description, photo, urgency)
- Track status: Reported → ContactedLandlord → InProgress → Resolved → Closed
- Log landlord contacts (method, summary, promise, date)
- Maintenance history per issue

## Audio / Video Calls (WebRTC)
- In-app audio and video calling between roommates
- WebRTC signaling via REST polling (1,500 ms interval)
- STUN servers (Google public)
- TURN server on EC2 (Coturn, port 3478 UDP/TCP)
  - Credential: `apptmasters` / `Turn2024Secure!`
- ICE candidate deduplication (Set-based)
- Caller continues polling after answer (no premature interval clear)
- Remote audio always has a `<video>` element in DOM (hidden for voice calls)
- Mute button with correct mic SVG + diagonal slash

## Infrastructure
- EC2 Ubuntu, PM2 process manager (`apptmasters` app)
- Nginx reverse proxy (HTTP → HTTPS redirect, SSL via Let's Encrypt)
- Route 53 DNS for `apptmasters.com` and `www.apptmasters.com`
- Resend email (domain verified, SPF/DKIM/DMARC)
- Coturn TURN server (log: `/var/log/turnserver.log`)
- SSH key: `~/Downloads/appmasters.pem`
- Deployment: `git pull --rebase` + `npm run build` + `pm2 restart apptmasters`
