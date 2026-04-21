import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use — Layak',
  description:
    'The terms under which Layak, a hackathon demonstration system for Malaysian social-assistance schemes, is provided.'
}

export default function TermsPage() {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 md:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Terms of Use</h1>
        <p className="text-sm text-muted-foreground">Effective: 21 April 2026</p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Layak is a research demonstration built for the MyAI Future Hackathon. By using it, you agree to the terms
          below.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">1. Hackathon scope</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Layak is a demonstration system, not a licensed financial, tax, or legal adviser. Outputs are educational and
          may be incomplete or out of date. Always confirm eligibility, amounts, and deadlines with the relevant agency
          (LHDN, JPN, JKM, or your local PPM) before acting on anything Layak shows you.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">2. Draft packets only</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Every application packet Layak generates is watermarked &ldquo;DRAFT &mdash; NOT SUBMITTED.&rdquo; Layak does
          not, and will not, file anything on your behalf with any Malaysian government portal. Submission is always
          manual and always your responsibility.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">3. Acceptable use</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>Sign in with your own Google account.</li>
          <li>Upload documents that belong to you, or for which you have explicit consent.</li>
          <li>
            Do not use Layak to evade taxes, misrepresent eligibility, or apply for schemes you do not qualify for.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">4. Account suspension</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          We may suspend or delete demo accounts that violate these terms or that abuse the free-tier rate limit (5
          evaluations per rolling 24 hours).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">5. As-is service</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Layak is provided &ldquo;as is,&rdquo; without warranty of any kind. The team makes no representation that
          the service will be available, accurate, or fit for any specific purpose during or after the hackathon
          judging window.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">6. Liability</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          To the extent permitted by Malaysian law, the Layak team is not liable for any direct, indirect, or
          consequential loss arising from your use of the service. You remain responsible for the accuracy of your own
          application packets and for any decisions you take based on Layak&rsquo;s output.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">7. Changes</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          We may update these terms during the hackathon period. The effective date at the top of this page reflects
          the latest version.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">8. Governing law</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          These terms are governed by the laws of Malaysia.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">9. Contact</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Reach the team via the project&rsquo;s GitHub repository.
        </p>
      </section>
    </article>
  )
}
