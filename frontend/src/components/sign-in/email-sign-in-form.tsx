'use client'

import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { signInWithEmail } from '@/lib/firebase'

function mapAuthError(t: ReturnType<typeof useTranslation>['t'], err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return t('auth.signIn.emailErrors.invalidCredential')
      case 'auth/user-disabled':
        return t('auth.signIn.emailErrors.userDisabled')
      case 'auth/too-many-requests':
        return t('auth.signIn.emailErrors.tooManyRequests')
      case 'auth/user-not-found':
        return t('auth.signIn.emailErrors.userNotFound')
      case 'auth/invalid-email':
        return t('auth.signIn.emailErrors.invalidEmail')
    }
  }
  return t('auth.signIn.emailErrors.generic')
}

export function EmailSignInForm({ onSuccess, disabled }: { onSuccess: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(evt: FormEvent<HTMLFormElement>) {
    evt.preventDefault()
    setError(null)
    setPending(true)
    try {
      await signInWithEmail(email.trim(), password, remember)
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
        <Label htmlFor="signin-email">{t('auth.signIn.emailLabel')}</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.signIn.emailPlaceholder')}
          disabled={busy}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="signin-password">{t('auth.signIn.passwordLabel')}</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.signIn.passwordPlaceholder')}
          disabled={busy}
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80 select-none">
        <Checkbox
          checked={remember}
          onCheckedChange={(next) => setRemember(next === true)}
          disabled={busy}
          aria-describedby="signin-remember-help"
        />
        <span id="signin-remember-help">{t('auth.signIn.rememberMe')}</span>
      </label>
      <Button
        type="submit"
        size="lg"
        disabled={busy || !email || !password}
        className="h-12 w-full bg-[color:var(--hibiscus)] text-base text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
      >
        {pending && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
        {t('auth.signIn.submit')}
      </Button>
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
    </form>
  )
}
