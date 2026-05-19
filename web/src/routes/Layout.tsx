import { Link, NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-zinc-900 text-xs font-bold text-white">
              LC
            </span>
            <span>Model Catalog</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-md px-2.5 py-1.5 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`
              }
            >
              All Models
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted">
            <a
              href="https://github.com/everstacklabs/llm-catalog"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted">
        Catalog data sourced from <span className="font-mono">providers/</span> · open source
      </footer>
    </div>
  );
}
