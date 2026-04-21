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
