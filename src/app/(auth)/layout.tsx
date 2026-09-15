import Image from "next/image"
import Link from "next/link"
import { Book, KanbanSquare, Ticket } from "lucide-react"

const features = [
  { icon: Ticket, label: "Support tickets", detail: "Raised, tracked, and resolved in one thread" },
  { icon: KanbanSquare, label: "Project boards", detail: "Drag-and-drop Kanban for every engagement" },
  { icon: Book, label: "Knowledge base", detail: "Searchable answers, no more digging through email" },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        {/* Animated aurora blobs */}
        <div
          aria-hidden
          className="animate-aurora-1 absolute -top-24 -left-24 size-96 rounded-full bg-brand-gold/30 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-aurora-2 absolute top-1/3 -right-32 size-[28rem] rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-aurora-3 absolute -bottom-32 left-1/4 size-96 rounded-full bg-brand-gold/20 blur-3xl"
        />
        {/* Texture overlay */}
        <div aria-hidden className="bg-dot-grid absolute inset-0 opacity-[0.15]" />

        <Link
          href="/"
          className="animate-in fade-in slide-in-from-top-2 relative z-10 flex items-center gap-2.5 text-lg font-semibold tracking-tight duration-700"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-white shadow-xs">
            <Image src="/logo-icon.png" alt="" width={32} height={28} className="size-6 object-contain" />
          </span>
          Levax Client Portal
        </Link>

        <div className="relative z-10 space-y-10">
          <ul className="space-y-4">
            {features.map((feature, i) => (
              <li
                key={feature.label}
                className="animate-in fade-in slide-in-from-bottom-2 flex items-start gap-3 fill-mode-both duration-700"
                style={{ animationDelay: `${150 + i * 120}ms` }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <feature.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{feature.label}</p>
                  <p className="text-sm text-primary-foreground/65">{feature.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <blockquote
            className="animate-in fade-in slide-in-from-bottom-2 space-y-3 border-t border-white/10 pt-6 fill-mode-both duration-700"
            style={{ animationDelay: "550ms" }}
          >
            <p className="text-2xl leading-snug font-medium text-balance">
              One place for support, projects, and everything in between.
            </p>
            <footer className="text-sm text-primary-foreground/70">
              Leverage Axiom — client success platform
            </footer>
          </blockquote>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-sm duration-500">{children}</div>
      </div>
    </div>
  )
}
