'use client'

import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { authedFetch, signUpWithEmail } from '@/lib/firebase'

function mapAuthError(t: ReturnType<typeof useTranslation>['t'], err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return t('auth.signUp.emailErrors.emailAlreadyInUse')
      case 'auth/invalid-email':
        return t('auth.signUp.emailErrors.invalidEmail')
      case 'auth/weak-password':
        return t('auth.signUp.emailErrors.weakPassword')
      case 'auth/operation-not-allowed':
        return t('auth.signUp.emailErrors.operationNotAllowed')
    }
  }
  return t('auth.signUp.emailErrors.generic')
}

export function EmailSignUpForm({
  consent,
  onSuccess,
  disabled
}: {
  consent: boolean
  onSuccess: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault()
    if (!consent) return
    setError(null)

    if (password.length < 8) {
      setError(t('auth.signUp.passwordTooShort'))
      return
    }
    if (!/\d/.test(password)) {
      setError(t('auth.signUp.passwordNeedsDigit'))
      return
    }

    setPending(true)
    try {
      await signUpWithEmail(email.trim(), password, displayName.trim() || undefined)

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
      await authedFetch(`${backendUrl}/api/quota`, {
        headers: { 'X-PDPA-Consent': 'true' }
      }).catch(console.error)

      onSuccess()
    } catch (err) {
      setPending(false)
      setError(mapAuthError(t, err))
    }
  }

  const busy = pending || disabled

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="signup-name">{t('auth.signUp.displayNameLabel')}</Label>
        <Input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('auth.signUp.displayNamePlaceholder')}
          disabled={busy}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="signup-email">{t('auth.signUp.emailLabel')}</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.signUp.emailPlaceholder')}
          disabled={busy}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="signup-password">{t('auth.signUp.passwordLabel')}</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.signUp.passwordPlaceholder')}
          disabled={busy}
        />
        <p className="text-xs text-muted-foreground">{t('auth.signUp.passwordRulesHint')}</p>
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={!consent || busy || !email || !password}
        className="h-12 w-full bg-[color:var(--hibiscus)] text-base text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
      >
        {pending && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
        {t('auth.signUp.submit')}
      </Button>
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
    </form>
  )
}
