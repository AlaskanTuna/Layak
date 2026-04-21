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
