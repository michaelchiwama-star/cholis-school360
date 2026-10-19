# CHOLIS School360 Lite (version 1.1, cloud-ready)

A demonstration app for Center for Holistic Schools Global (CHOLIS). Teachers request learner support, CHOLIS professionals coordinate follow-up, school leaders see totals only, and parents use a public resource hub.

**All schools, learners and staff in this app are fictional. Do not enter real information.**

## What changed in version 1.1

| Change | Why |
|---|---|
| Secure sign-in: the server issues a signed session after login and checks it on every request | Before, the server trusted whatever the browser *said* about who you were, so anyone online could pretend to be an administrator |
| Passwords stored as secure hashes; 10 wrong guesses blocks sign-in for 15 minutes | Basic protection for a public link |
| Demo password can be changed for the online version and is then hidden from the login page | So only people you invite can sign in |
| Data is now actually saved to disk | Version 1.0 kept data in memory only, so it was lost when the server stopped |
| "Demonstration version · fictional data" banner on every page | So no visitor mistakes it for a live service |
| One service runs the whole app, with a `Dockerfile` | Needed for IBM Cloud Code Engine |
| Length limits on all form fields; school checks on assignments and activity history | Stops misuse of the public forms and keeps each school's data separate |

The pages, workflow and design are unchanged.

## Run on your own computer (same as before)

```powershell
cd server
npm install
npm run dev          # http://localhost:3001

# in a second window
cd client
npm install
npm run dev          # open http://localhost:5173
```

Or run `start.ps1`. Locally the demo password is still `demo1234`, shown on the login page.

| Role | Username |
|---|---|
| Teacher (Mr. Chanda Mulenga) | `teacher1` |
| Teacher (Ms. Thandiwe Banda) | `teacher2` |
| CHOLIS Professional (Ms. Yvonne Sikaonga) | `professional1` |
| School Leader (Mrs. Nkandu Phiri) | `leader1` |
| CHOLIS Administrator (Mr. Kelvin Zulu) | `admin1` |

Parent Hub (no sign-in): http://localhost:5173/parent

## Put it online with IBM Cloud Code Engine

In IBM Cloud, open **Cloud Shell** (the terminal icon at the top right of the console). Upload this zip with the Cloud Shell upload button, then run:

```bash
unzip -o CHOLIS_School360_v1.1_cloud.zip -d school360 && cd school360
ibmcloud target -r eu-de -g Default
ibmcloud ce project create --name cholis-school360
ibmcloud ce secret create --name school360-settings \
  --from-literal DEMO_PASSWORD='CHOOSE-A-PASSWORD' \
  --from-literal SESSION_SECRET="$(openssl rand -hex 32)"
ibmcloud ce application create --name school360 \
  --build-source . --strategy dockerfile \
  --port 8080 --min-scale 0 --max-scale 1 \
  --env-from-secret school360-settings
```

The last command builds the app (a few minutes) and prints its public web address.

**Important settings**
- `--max-scale 1` keeps exactly one copy of the app running, so everyone sees the same data. Do not raise it.
- `--min-scale 0` lets the app sleep when nobody is using it, which saves your cloud allowance. When it wakes, the demo school is reset to its starting data. That is intentional for a demonstration.

**To publish changes later:** upload the new zip, unzip it, then run
`ibmcloud ce application update --name school360 --build-source . --strategy dockerfile`

## Settings

| Setting | Purpose | Default |
|---|---|---|
| `DEMO_PASSWORD` | Password for all demo accounts. When set, it is hidden on the login page. | `demo1234`, shown |
| `SESSION_SECRET` | Signs sign-in sessions. Keep it private. | Random at each start |
| `SESSION_HOURS` | How long a sign-in lasts | `8` |
| `PORT` | Web port | `3001` locally, `8080` in the container |

## Still simulated or not production-ready

- The **AI Teacher Support Assistant** gives demonstration answers. It is not yet connected to IBM watsonx Orchestrate.
- Accounts are **shared demo accounts**. Real schools would need individual accounts and password resets.
- Online data is **temporary** (reset when the app sleeps or restarts). Real use needs a managed database and backups.
- Before any real learner information is used: Zambia Data Protection Act review, consent processes, and a security review.

## Tests

`tests/security-and-workflow-tests.sh` checks 28 things, including that fake identities are refused, schools cannot see each other's data, and school leaders cannot read teachers' notes. Run it against a running copy: `BASE=http://localhost:8080 PW=yourpassword bash tests/security-and-workflow-tests.sh`.

The older `acceptance-tests.ps1` from version 1.0 is not included, because it relied on the insecure sign-in method that version 1.1 removes.
