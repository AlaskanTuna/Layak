# RUNBOOK (AGENT + HUMAN)

> Ops procedures for Layak. Keep commands copy-pasteable. Reference `docs/trd.md` for the _why_; this file is the _how_.

---

## 1. Firestore rollout (Phase 2 Task 1)

Contract: `firestore.rules` + `firestore.indexes.json` at repo root, pointed at by `firebase.json`. Schema lives in `docs/trd.md` §5.5 and `docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md` §3.3–§3.4.

### 1.1 Pre-flight

```bash
gcloud config set project layak-myaifuturehackathon
gcloud services enable firestore.googleapis.com

# One-time: provision Firestore (Native mode) in asia-southeast1.
# Safe to skip if already provisioned — will exit non-zero on a second call.
gcloud firestore databases create \
  --location=asia-southeast1 \
  --type=firestore-native \
  --project=layak-myaifuturehackathon
```

### 1.2 Deploy rules + indexes via Firebase CLI (preferred)

Single command covers both files. The committed `.firebaserc` binds the default project, so `firebase use` is not required on first run.

```bash
# Install firebase-tools once per machine.
# npm i -g firebase-tools   # or: pnpm dlx firebase-tools@latest ...

firebase deploy --only firestore:rules,firestore:indexes
```

### 1.3 Alternative: gcloud-only composite index creation

**Use §1.2 OR §1.3 — not both.** Running `gcloud firestore indexes composite create` after the Firebase CLI has already created the same index errors with `ALREADY_EXISTS`.

If Firebase CLI isn't available, the `(userId ASC, createdAt DESC)` composite index can be created with gcloud:

```bash
gcloud firestore indexes composite create \
  --collection-group=evaluations \
  --query-scope=COLLECTION \
  --field-config=field-path=userId,order=ascending \
  --field-config=field-path=createdAt,order=descending \
  --project=layak-myaifuturehackathon
```

Security rules still require the Firebase CLI (`firebase deploy --only firestore:rules`) — `gcloud` has no rules-deploy equivalent.

### 1.4 Verification

```bash
# Should show the evaluations composite: userId ASC, createdAt DESC.
gcloud firestore indexes composite list --project=layak-myaifuturehackathon

# Show the rules currently live on the Firestore instance.
firebase firestore:rules:get
```

---

## 2. Firebase Admin secret + authed backend deploy (Phase 2 Task 2)

Landed contract: `backend/app/auth.py` verifies the Firebase ID token on every `/api/agent/intake` request and lazy-creates `users/{uid}` (shape from `docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md` §3.3). The backend needs a Firebase service-account JSON key mounted as `FIREBASE_ADMIN_KEY` to boot the Admin SDK.

### 2.1 Create the service account and grant roles

```bash
# One-time: service account scoped to Firebase Admin + Firestore user data.
gcloud iam service-accounts create layak-firebase-admin \
  --display-name="Layak Firebase Admin" \
  --project=layak-myaifuturehackathon

SA_EMAIL="layak-firebase-admin@layak-myaifuturehackathon.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding layak-myaifuturehackathon \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebaseauth.admin"

gcloud projects add-iam-policy-binding layak-myaifuturehackathon \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"
```

> **Role note.** `roles/firebaseauth.admin` covers `verify_id_token`, lazy user creation, and the Phase 4 `auth.delete_user(uid)` cascade. `roles/datastore.user` covers Firestore read/write. Do **not** use `roles/firebase.sdkAdminServiceAgent` — that is a Google-managed role for Google's own service agents and shouldn't be granted to customer SAs.

### 2.2 Generate the key and push to Secret Manager

```bash
KEY_FILE="$(mktemp -t layak-fb-XXXXXX.json)"

gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project=layak-myaifuturehackathon

gcloud secrets create firebase-admin-key \
  --replication-policy=automatic \
  --project=layak-myaifuturehackathon

gcloud secrets versions add firebase-admin-key \
  --data-file="${KEY_FILE}" \
  --project=layak-myaifuturehackathon

# Never leave the JSON on disk.
rm -f "${KEY_FILE}"

gcloud secrets add-iam-policy-binding firebase-admin-key \
  --member="serviceAccount:297019726346-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=layak-myaifuturehackathon
```

### 2.3 Redeploy the backend with the secret wired in

```bash
gcloud run deploy layak-backend --source backend \
  --region asia-southeast1 \
  --min-instances 1 --cpu-boost --allow-unauthenticated \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_ADMIN_KEY=firebase-admin-key:latest" \
  --memory 1Gi --timeout 300 \
  --project layak-myaifuturehackathon
```

### 2.3.1 Secret rotation

The Admin SDK client and Firestore client are process-cached (`_app` and `_firestore_client` in `backend/app/auth.py`). A rotated secret version in Secret Manager does **not** take effect on an already-warm revision — you must deploy a new revision for the rotation to land. Run §2.3 again after adding the new secret version; old versions can be disabled once the new revision is healthy.

### 2.4 Verification

```bash
# Unauthed → 401 (backend behaviour is now "token required").
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST https://layak-backend-297019726346.asia-southeast1.run.app/api/agent/intake

# With a real ID token minted by the Phase 2 Task 3 frontend:
#   curl -X POST -H "Authorization: Bearer $ID_TOKEN" -F ic=@... -F payslip=@... -F utility=@... \
#     https://layak-backend-297019726346.asia-southeast1.run.app/api/agent/intake
```

---

## 3. Phase 2 Task 4 — integration smoke test

End-to-end check that fresh-browser sign-in lands on `/dashboard`, that an authed backend call upserts `users/{uid}` in Firestore, and that `/api/agent/intake` returns 200 (not a redirect or anonymous fallback) with the bearer token attached.

### 3.0 Prerequisites

- Cloud Run host on the Firebase **Authorized domains** list (Identity Toolkit Admin API → §3.5 fix recipe). Without this, `signInWithPopup` throws `auth/unauthorized-domain` before the rest of the test can run.
- Backend reachable at `https://layak-backend-297019726346.asia-southeast1.run.app/health` → 200.
- Frontend reachable at `https://layak-frontend-297019726346.asia-southeast1.run.app`.

### 3.1 Browser flow (manual)

Use a fresh incognito window so you exercise the cold-cache path.

1. Navigate to `https://layak-frontend-297019726346.asia-southeast1.run.app/sign-in`.
2. Click **Continue with Google**, choose your account, accept consent.
3. Confirm the URL becomes `/dashboard` **without a manual reload**. The `useEffect` redirect in `frontend/src/components/sign-in/sign-in-form.tsx` should fire as soon as `useAuth().user` flips to truthy.

If `/dashboard` does not render automatically, check the DevTools console for `auth/unauthorized-domain` or token errors before retrying.

### 3.2 Capture the ID token from DevTools

The Firebase modular SDK does not expose a `firebase` global, and a fresh `import('https://www.gstatic.com/.../firebase-auth.js')` returns a different module instance from the one the bundled app initialised — `getAuth()` on it throws `app/no-app`. Read the persisted user record from IndexedDB instead. `navigator.clipboard.writeText` requires page focus; clicking into DevTools de-focuses it, so the snippet `console.log`s a copy-friendly string instead.

```js
;(async () => {
  const apiKey = 'AIzaSyAOkuoODA2epkzPw2Vva1lYrnG3lIqAxXE'
  const open = indexedDB.open('firebaseLocalStorageDb')
  const db = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result)
    open.onerror = () => rej(open.error)
  })
  const all = await new Promise((res, rej) => {
    const r = db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll()
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  const entry = all.find((e) => e?.fbase_key?.startsWith(`firebase:authUser:${apiKey}`))
  if (!entry) {
    console.error('No Firebase user found in IDB')
    return
  }
  const u = entry.value
  const payload = JSON.stringify({
    uid: u.uid,
    email: u.email,
    idToken: u.stsTokenManager.accessToken,
    expiresAt: new Date(u.stsTokenManager.expirationTime).toISOString()
  })
  console.log('===PASTE-THIS-TO-CLAUDE===\n' + payload + '\n===END===')
})()
```

Tokens are valid for 1 hour from `auth_time`. Run the curl checks below within that window.

### 3.3 Live browser check (joint pre-demo sign-off)

The five checkboxes Phase 2 Task 4 is gated on. Run this together (PO1 + PO2) against the deploy you intend to demo. Tick each box only after observing the behaviour live.

- [ ] **(1) Fresh incognito** — open a new private window at `https://layak-frontend-297019726346.asia-southeast1.run.app/sign-in`. No prior session cookies in scope.
- [ ] **(2) `/dashboard` auto-redirect** — click _Continue with Google_, finish the account picker. URL becomes `/dashboard` **without a manual reload** — the `useEffect` in `frontend/src/components/sign-in/sign-in-form.tsx` fires on `useAuth().user`.
- [ ] **(3) Firestore user doc populated** — pull the UID from the §3.2 IDB snippet (or Firebase Auth user-menu chip), then verify `users/{uid}` exists with the correct shape via §3.4. The `createTime` should be in the same second as the first `/api/agent/intake*` call in checkbox 4 — that's the proof that `_upsert_user_doc` ran on the auth dependency, not on sign-in alone.
- [ ] **(4) Bearer-authed intake → 200** — open DevTools → Network, then run an evaluation through the dashboard (real upload via `/dashboard/evaluation/upload`, or the Manual Entry form against `/api/agent/intake_manual`). Confirm the POST shows `Authorization: Bearer <token>` in request headers and the response is `200 OK` with `content-type: text/event-stream`. Synthetic CLI fallback in §3.6.
- [ ] **(5) Sign-out cleanup** — click the user menu in the topbar → _Sign out_. URL redirects to `/sign-in` and the entry under `Application → IndexedDB → firebaseLocalStorageDb → firebaseLocalStorage` whose key starts with `firebase:authUser:` is cleared.

### 3.4 Confirm `users/{uid}` exists in Firestore

The same gcloud OAuth token used to manage Firebase config (§3.5) reads Firestore via the REST API. Pass the UID printed in the DevTools snippet (or read it from the ID token claims):

```bash
ACCESS_TOKEN=$(gcloud auth print-access-token)
# Bash treats `UID` as readonly (your Unix UID, e.g. 1000); assigning it
# silently fails and the curl below would then 404 against `users/1000`.
# Use `FB_UID` (or any non-readonly name) for the Firebase UID.
FB_UID="<paste-uid>"     # claims.uid from the decoded ID token

curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Goog-User-Project: layak-myaifuturehackathon" \
  "https://firestore.googleapis.com/v1/projects/layak-myaifuturehackathon/databases/(default)/documents/users/${FB_UID}"
# Expected: JSON body with fields email, displayName, photoURL, tier, createdAt,
# lastLoginAt, pdpaConsentAt. A 404 `NOT_FOUND` means checkbox 4 in §3.3 never
# executed (no authed call has been made, so `_upsert_user_doc` never ran).
```

### 3.5 Firebase Auth authorized domains (one-off fix recipe)

Cloud Run hostnames are not on Firebase's default authorized list. The default Identity Toolkit error self-diagnoses but offers no CLI path; this is the gcloud-only recipe.

```bash
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Read current list — PATCH replaces the array, so include defaults.
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Goog-User-Project: layak-myaifuturehackathon" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/layak-myaifuturehackathon/config" \
  | grep -A 6 authorizedDomains

# PATCH with the union (replace the run.app host with whatever you need to add).
curl -sS -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Goog-User-Project: layak-myaifuturehackathon" \
  -H "Content-Type: application/json" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/layak-myaifuturehackathon/config?updateMask=authorizedDomains" \
  -d '{
    "authorizedDomains": [
      "localhost",
      "layak-myaifuturehackathon.firebaseapp.com",
      "layak-myaifuturehackathon.web.app",
      "layak-frontend-297019726346.asia-southeast1.run.app"
    ]
  }'
```

Wildcard hosts are not supported. Per-revision Cloud Run URLs (`*-i2t7hf6seq-as.a.run.app`) need to be added separately if you want to test against them.

### 3.6 Synthetic CLI proof for §3.3 sub-step 4

Useful when you want to exercise the auth gate without firing up a browser flow — e.g. confirming a fresh deploy still rejects the unauthed path and accepts a valid bearer. The bundled scheme PDFs are real binaries the multipart parser will accept; pipeline extraction quality is irrelevant here, only the response status and headers.

```bash
ID_TOKEN="<paste-token-from-§3.2>"
BACKEND="https://layak-backend-297019726346.asia-southeast1.run.app"
SCHEMES="$(git rev-parse --show-toplevel)/backend/data/schemes"

# Control: unauthed → 401 (auth gate live).
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST "$BACKEND/api/agent/intake"
# Expected: HTTP 401

# Authed multipart intake → 200 SSE.
# `--max-time 8` cuts the stream early; status line lands in stdout before
# the body starts streaming, so curl exit 28 (timeout) is expected and fine.
curl -sS -D - -o /dev/null --max-time 8 --no-buffer \
  -X POST \
  -H "Authorization: Bearer $ID_TOKEN" \
  -F "ic=@${SCHEMES}/bk-01.pdf" \
  -F "payslip=@${SCHEMES}/risalah-str-2026.pdf" \
  -F "utility=@${SCHEMES}/rf-filing-programme-for-2026.pdf" \
  "$BACKEND/api/agent/intake" \
  | head -1
# Expected: HTTP/2 200 (followed by `content-type: text/event-stream`)
```

The HTTP/2 200 status line is dispatched the moment FastAPI returns the `StreamingResponse`, which only happens after `current_user` resolves and `_upsert_user_doc` writes — so observing 200 here is sufficient evidence that §3.3 sub-step 3 (Firestore upsert) and sub-step 4 (Bearer-authed 200) both succeeded against this revision.
