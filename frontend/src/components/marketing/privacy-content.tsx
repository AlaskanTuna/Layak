'use client'

import { Trans, useTranslation } from 'react-i18next'

export function PrivacyContent() {
  const { t } = useTranslation()
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 md:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {t('marketing.privacy.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('marketing.privacy.effective')}</p>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.privacy.intro')}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section1Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>
            <Trans
              i18nKey="marketing.privacy.section1Google"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="marketing.privacy.section1Documents"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="marketing.privacy.section1History"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="marketing.privacy.section1Consent"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section2Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>{t('marketing.privacy.section2MyKad')}</li>
          <li>{t('marketing.privacy.section2Files')}</li>
          <li>{t('marketing.privacy.section2Logs')}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section3Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>{t('marketing.privacy.section3Matching')}</li>
          <li>{t('marketing.privacy.section3Packets')}</li>
          <li>{t('marketing.privacy.section3History')}</li>
          <li>{t('marketing.privacy.section3FairUse')}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section4Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          <Trans i18nKey="marketing.privacy.section4Body" components={{ code: <code /> }} />
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section5Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>{t('marketing.privacy.section5FreeDelete')}</li>
          <li>{t('marketing.privacy.section5ProKeep')}</li>
          <li>{t('marketing.privacy.section5AccountDelete')}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section6Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>
            <Trans
              i18nKey="marketing.privacy.section6Access"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="marketing.privacy.section6Deletion"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="marketing.privacy.section6Withdrawal"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section7Title')}</h2>
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
          <li>{t('marketing.privacy.section7NoSubmit')}</li>
          <li>{t('marketing.privacy.section7NoThirdParty')}</li>
          <li>{t('marketing.privacy.section7NoSell')}</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section8Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">{t('marketing.privacy.section8Body')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.privacy.section9Title')}</h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          <Trans i18nKey="marketing.privacy.section9Body" components={{ code: <code /> }} />
        </p>
      </section>
    </article>
  )
}
