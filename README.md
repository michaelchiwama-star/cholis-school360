# CHOLIS School360 Lite

**Built with IBM Bob and IBM watsonx Orchestrate · IBM SkillsBuild AI Experiential Learning Lab**

School360 Lite helps a school get every struggling learner the right support at the right time. It connects teachers, the school's Counselling and Learner Support Department, head teachers, parents and the Center for Holistic Schools Global (CHOLIS) in one simple web app, built for Zambian schools, phones and low bandwidth.

- **Live demo:** https://cholis-school360.onrender.com
- **Organisation:** Center for Holistic Schools Global (CHOLIS), Lusaka, Zambia · https://allholisticschools.org

> **All schools, learners and staff in this app are fictional. Do not enter real information.**

## How IBM Bob was used

The first version of this application was created with **IBM Bob**, working from a detailed product brief:

- Bob inspected the development environment and chose a low-cost stack: React and TypeScript (Vite) for the web app, an Express and TypeScript server, and a SQLite database, with no paid services.
- Bob designed the architecture and created the application files: the five role experiences (teacher, professional, school leader, parent, CHOLIS administrator), the database, role-based access, school-level data isolation, the leadership dashboard with confidential details hidden, the parent resource hub, the Alliance membership forms and a fictional Zambian demo school.
- Bob wrote and ran 25 acceptance tests, diagnosed the failures and fixed them until all 25 passed.
- Bob documented what was simulated, left a clear integration point for the watsonx Orchestrate agent, and listed next steps.

This architecture, data model and connected workflow remain the foundation of the app. After my IBM Bob lab access ended, I extended Bob's codebase with AI coding assistance (Claude by Anthropic): secure sign-in, the live watsonx Orchestrate connection, routing to the school's own department, the CHOLIS inbox, notifications and the parent enquiry routing.

## The AI agent: CHOLIS Teacher Support Assistant

- Built in **IBM watsonx Orchestrate** and connected live to the app's teacher and department portals.
- Answers are grounded (RAG) in approved documents: the CHOLIS Classroom Support Guide, the CHOLI-S Ubuntu programmes and the Ministry of Education Catch Up (Teaching at the Right Level) teacher's guides.
- It gives general classroom strategies only. It never diagnoses learners or makes safeguarding decisions, and points safeguarding concerns to the school's Child Protection Focal Person.
- The server calls Orchestrate with an IBM Cloud API key held as a private setting, never in the code. Learner names are never sent.

## What the app does

| Who | What they can do |
|---|---|
| Teacher | Submit a support request using a learner reference ID (never a name), track its status, use CHOLIS-approved classroom tips, ask the AI assistant |
| School Counsellor / Learner Support Coordinator | Receive requests routed to them automatically, update status, ask CHOLIS for extra help, respond to parent enquiries, use the AI assistant |
| Head teacher | See totals, response times, trends and a printable monthly report, with no private case details |
| Parent (no account) | Read practical tips and ask for support, choosing their child's school department or CHOLIS |
| CHOLIS Administrator | Handle requests from schools in the CHOLIS inbox, consultation and membership enquiries, and parent enquiries sent to CHOLIS |

## Repository layout

| Path | What it is |
|---|---|
| `client/` | The web app (React, TypeScript, Vite) |
| `server/` | The server and database (Express, TypeScript, SQLite via sql.js) |
| `school360-source.bundle` | A zip of `client/` and `server/`. The live site is built from this file by the `Dockerfile` |
| `Dockerfile` | Builds and runs the whole app in one container (used by Render) |
| `start.ps1` | Starts the app on a Windows computer |

## Run it on your own computer

Needs Node.js 20 or later.

```bash
cd server && npm install && npm run dev     # server on http://localhost:3001
cd client && npm install && npm run dev     # open http://localhost:5173
```

Locally, every demo account uses the password `demo1234`. The accounts are listed on the sign-in page.

## Settings (for hosting)

| Setting | Purpose |
|---|---|
| `DEMO_PASSWORD` | Password for all demo accounts (hidden on the sign-in page when set) |
| `SESSION_SECRET` | Signs sign-in sessions; keep private |
| `WXO_INSTANCE_URL`, `WXO_API_KEY`, `WXO_AGENT_ID` | Connect the watsonx Orchestrate agent |
| `BREVO_API_KEY`, `NOTIFY_FROM_EMAIL`, `CHOLIS_NOTIFY_EMAILS` | Optional email alerts (alerts never contain learner details) |

## Responsible use

- Reference IDs only; no learner names, diagnoses or safeguarding details in forms, AI questions or alerts.
- Each school sees only its own data. Head teachers see totals only, never case details. (Hiding very small counts, so no learner can be identified, is planned before real use.)
- Qualified people make every decision about a learner; the AI gives general guidance only.
- Before real learner information is used: individual accounts, a managed database with backups, a Zambia Data Protection Act review and a security review.
