import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, LayoutDashboard } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-primary p-6 text-primary-foreground">
      <div
        aria-hidden
        className="animate-aurora-1 absolute -top-24 -left-24 size-96 rounded-full bg-brand-gold/30 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-aurora-2 absolute top-1/3 -right-32 size-[28rem] rounded-full bg-white/15 blur-3xl"
      />
      <div aria-hidden className="bg-dot-grid absolute inset-0 opacity-[0.15]" />

      <div className="animate-in fade-in slide-in-from-bottom-2 relative z-10 flex max-w-md flex-col items-center gap-6 text-center duration-700">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-lg">
          <Image src="/logo-icon.png" alt="" width={44} height={38} className="size-9 object-contain" />
        </span>

        <div className="space-y-2">
          <p className="text-7xl font-semibold tracking-tight">404</p>
          <h1 className="text-xl font-semibold text-balance">This page wandered off the board</h1>
          <p className="text-sm text-primary-foreground/70">
            The page you&apos;re looking for doesn&apos;t exist, was moved, or you don&apos;t have
            access to it.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            render={<Link href="/dashboard" />}
            className="bg-white text-primary hover:bg-white/90"
          >
            <LayoutDashboard />
            Go to dashboard
          </Button>
          <Button variant="outline" render={<Link href="/login" />} className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10">
            <ArrowLeft />
            Back to sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
