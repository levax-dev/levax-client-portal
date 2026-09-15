import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary-foreground)_18%,transparent),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_90%,color-mix(in_oklch,var(--primary-foreground)_12%,transparent),transparent_50%)]" />
        <Link href="/" className="relative z-10 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white shadow-xs">
            <Image src="/logo-icon.png" alt="" width={32} height={28} className="size-6 object-contain" />
          </span>
          Levax Client Portal
        </Link>
        <blockquote className="relative z-10 space-y-3">
          <p className="text-2xl leading-snug font-medium text-balance">
            One place for support, projects, and everything in between.
          </p>
          <footer className="text-sm text-primary-foreground/70">
            Leverage Axiom — client success platform
          </footer>
        </blockquote>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
