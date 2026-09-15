"use client"

import { useActionState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { signInWithMagicLink, signInWithPassword } from "@/app/actions/auth"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"

  const [passwordState, passwordAction] = useActionState(signInWithPassword, null)
  const [magicLinkState, magicLinkAction] = useActionState(signInWithMagicLink, null)

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your Levax client portal account.</p>
      </div>

      <Tabs defaultValue="password">
        <TabsList className="w-full">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="magic-link">Magic link</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="mt-4">
          <form action={passwordAction}>
            <input type="hidden" name="next" value={next} />
            <FieldGroup>
              {passwordState?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordState.error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </Field>
              <SubmitButton className="w-full" pendingText="Signing in…">
                Sign in
              </SubmitButton>
            </FieldGroup>
          </form>
        </TabsContent>

        <TabsContent value="magic-link" className="mt-4">
          <form action={magicLinkAction}>
            <FieldGroup>
              {magicLinkState?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{magicLinkState.error}</AlertDescription>
                </Alert>
              )}
              {magicLinkState?.success && (
                <Alert>
                  <AlertDescription>{magicLinkState.success}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="magic-email">Email</FieldLabel>
                <Input id="magic-email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
                <FieldDescription>We&apos;ll email you a one-time sign-in link.</FieldDescription>
              </Field>
              <SubmitButton className="w-full" pendingText="Sending…">
                Send magic link
              </SubmitButton>
            </FieldGroup>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
