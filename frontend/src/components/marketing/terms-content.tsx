'use client'

import { useTranslation } from 'react-i18next'

export function TermsContent() {
  const { t } = useTranslation()
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 md:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {t('marketing.terms.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('marketing.terms.effective')}</p>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.intro')}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section1Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section1Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section2Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section2Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section3Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>{t('marketing.terms.section3OwnAccount')}</li>
          <li>{t('marketing.terms.section3OwnDocuments')}</li>
          <li>{t('marketing.terms.section3NoEvade')}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section4Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section4Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section5Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section5Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section6Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section6Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section7Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section7Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section8Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section8Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.terms.section9Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.terms.section9Body')}</p>
      </section>
    </article>
  )
}
