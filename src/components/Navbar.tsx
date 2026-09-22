import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export function Navbar() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold">
          SplitBrief
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Projects
          </Link>
          <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
