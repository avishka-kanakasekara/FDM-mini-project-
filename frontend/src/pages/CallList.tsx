import { Link } from "react-router-dom";

import { useCallList } from "../campaign/callList";
import { callListNote, customerSections, customerSummary, outreachAction, outreachNote } from "../campaign/briefing";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { formatPercent } from "../utils/format";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CallList() {
  const { items, remove, clear } = useCallList();
  const { notify } = useToast();
  const priorityCount = items.filter((item) => item.result.above_threshold).length;

  async function copyList() {
    const copied = await copyText(callListNote(items));
    notify(copied ? "Call list copied." : "The browser blocked copying. Select the list and copy it manually.", copied ? "info" : "error");
  }

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Campaign desk</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Today's call list</h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Customers are ordered by the estimated subscription probability from the saved model. Each card has the recorded profile, the contact channel, and the campaign history so the team can place the call. The file does not include a phone number or a personal name.
        </p>
      </header>

      {items.length === 0 ? (
        <section className="panel p-6">
          <h2 className="font-serif text-2xl">No customers scored yet</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Open Prediction, enter a customer the team could call, and add the assessment here. Each row is a real model score. The list stays in this browser so a campaign officer can work through it today.
          </p>
          <Link
            to="/predict"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-br from-[#18a674] to-[#0c6d4c] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Score a customer
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">On the list</p>
              <p className="mt-2 font-serif text-4xl">{items.length}</p>
            </article>
            <article className="panel bg-gradient-to-br from-white to-leaf-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contact first</p>
              <p className="mt-2 font-serif text-4xl text-leaf">{priorityCount}</p>
            </article>
            <article className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Contact later</p>
              <p className="mt-2 font-serif text-4xl text-brass">{items.length - priorityCount}</p>
            </article>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copyList}>
              Copy call list
            </Button>
            <Button type="button" variant="secondary" onClick={() => { clear(); notify("Today's call list cleared."); }}>
              Clear list
            </Button>
          </div>

          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Call {index + 1}</p>
                    <h2 className="mt-1 text-lg font-semibold">{customerSummary(item.request)}</h2>
                  </div>
                  <p className="font-serif text-3xl">{formatPercent(item.result.probability)}</p>
                </div>
                <p
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    item.result.above_threshold ? "bg-leaf-soft text-leaf" : "bg-brass-soft text-brass"
                  }`}
                >
                  {item.result.decision_label}
                </p>
                <p className="mt-3 text-sm leading-6">{outreachAction(item.result)}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {customerSections(item.request).map((section) => (
                    <section key={section.title} className="rounded-2xl bg-paper px-4 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{section.title}</h3>
                      <dl className="mt-2 space-y-1.5">
                        {section.facts.map((fact) => (
                          <div key={fact.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                            <dt className="text-muted">{fact.label}</dt>
                            <dd className="text-right font-semibold">{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      const copied = await copyText(outreachNote(item.request, item.result));
                      notify(
                        copied ? "Customer brief copied." : "The browser blocked copying. The details are on this card.",
                        copied ? "info" : "error",
                      );
                    }}
                  >
                    Copy customer brief
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => remove(item.id)}>
                    Remove from list
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
