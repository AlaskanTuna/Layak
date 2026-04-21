import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Notice — Layak',
  description:
    "How Layak handles your personal data under Malaysia's Personal Data Protection Act 2010 (PDPA)."
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 md:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Privacy Notice
        </h1>
        <p className="text-sm text-muted-foreground">Effective: 21 April 2026</p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Layak is a hackathon submission to the MyAI Future Hackathon. This notice describes what we collect, what we
          do with it, and the rights you keep under Malaysia&rsquo;s Personal Data Protection Act 2010 (PDPA).
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">1. What we collect</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Google account profile</strong> when you sign in: email, display name,
            profile photo, and the Firebase user identifier.
          </li>
          <li>
            <strong className="text-foreground">Documents you upload</strong> to run an evaluation &mdash; typically a
            MyKad, a payslip or income screenshot, and a utility bill.
          </li>
          <li>
            <strong className="text-foreground">Evaluation history</strong>: the structured profile we extracted from
            your documents and the schemes you matched against, persisted in Firestore so you can see your past runs.
          </li>
          <li>
            <strong className="text-foreground">Consent timestamp</strong> recorded when you tick the PDPA checkbox on
            sign-up.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">2. What we do not store</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>Your full MyKad number &mdash; we keep only the last four digits.</li>
          <li>
            The original bytes of your uploaded files. Extraction runs in-memory inside a single request, and the raw
            files are discarded once the structured profile is produced.
          </li>
          <li>IC numbers, authentication tokens, or document content in any log line.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">3. Why we collect it</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>To match you against locked Malaysian schemes (STR 2026, JKM Warga Emas, LHDN Form B reliefs).</li>
          <li>
            To generate your draft application packets, every page watermarked &ldquo;DRAFT &mdash; NOT SUBMITTED.&rdquo;
          </li>
          <li>To show you a history of your past evaluations on the dashboard.</li>
          <li>To enforce per-user fair-use rate limits on the free tier.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">4. Where it lives</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          All processing and storage happens in Google Cloud, <code>asia-southeast1</code> region. The Cloud Run
          services and the Firestore database are owned by the Layak team. Authentication is handled by Firebase
          Authentication, also under our project.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">5. How long we keep it</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>Free-tier evaluations are deleted after 30 days by an automated nightly job.</li>
          <li>Pro-tier evaluations persist until you delete them.</li>
          <li>
            You can request immediate deletion of your account and all linked records at any time from the Settings
            page.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">6. Your PDPA rights</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Access</strong> &mdash; download a JSON export of your profile and full
            evaluation history.
          </li>
          <li>
            <strong className="text-foreground">Deletion</strong> &mdash; remove your account, your Firestore records,
            and your Firebase Auth identity in one action.
          </li>
          <li>
            <strong className="text-foreground">Withdrawal</strong> &mdash; revoke consent by deleting your account.
            Further sign-in attempts will require fresh consent.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">7. What we never do</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>
            We never submit anything on your behalf to LHDN, JPN, JKM, or any government portal. Every output is a draft
            packet you submit manually.
          </li>
          <li>We never share your data with third parties for advertising.</li>
          <li>We do not sell your data.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">8. Demo and hackathon scope</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Layak is a non-production hackathon project. Use synthetic documents wherever possible during the demo
          period. Do not upload another person&rsquo;s MyKad or financial documents without their explicit consent.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">9. Contact</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Reach the team via the project&rsquo;s GitHub repository. For PDPA-specific queries, open an issue tagged{' '}
          <code>pdpa</code>.
        </p>
      </section>
    </article>
  )
}
