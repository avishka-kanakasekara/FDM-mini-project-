import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("BankReach screen failed", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="grid min-h-screen place-items-center bg-paper px-6">
          <section className="panel max-w-md p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">BankReach</p>
            <h1 className="mt-3 font-serif text-3xl">This screen needs a reload</h1>
            <p className="mt-3 text-muted">
              An unexpected problem stopped this page. The assessment service may still be available.
              Reload and continue from the overview.
            </p>
            <button
              type="button"
              className="mt-6 rounded-xl bg-gradient-to-br from-[#18a674] to-[#0c6d4c] px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => window.location.assign("/")}
            >
              Return to overview
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
