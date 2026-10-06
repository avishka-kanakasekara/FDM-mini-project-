import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="panel mx-auto max-w-lg px-8 py-14 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">404</p>
      <h1 className="mt-3 font-serif text-5xl tracking-tight">This page is not on the desk</h1>
      <p className="mt-4 text-muted">The address does not match a BankReach screen. Return to the overview or start a prediction.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-xl bg-gradient-to-br from-[#18a674] to-[#0c6d4c] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-leaf/20">
          Back to overview
        </Link>
        <Link to="/predict" className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold">
          Start prediction
        </Link>
      </div>
    </section>
  );
}
