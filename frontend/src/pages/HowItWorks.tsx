import { Link } from "react-router-dom";

const STEPS = [
  { title: "Customer information", copy: "A campaign officer enters the profile, contact plan, history, and economic context known before the call." },
  { title: "Input validation", copy: "The service checks that every value is present, finite, and one of the categories the model was built with." },
  { title: "ML feature processing", copy: "The saved pipeline prepares those raw inputs. The screen does not rebuild that preparation." },
  { title: "Prediction model", copy: "Logistic regression, the model selected in the project, estimates a subscription probability." },
  { title: "Subscription probability", copy: "The result is an estimated likelihood, shown as a percentage a person can read." },
  { title: "Outreach priority", copy: "If the estimate is at or above the stored threshold, the profile is marked for higher-priority outreach. Otherwise it is lower priority." },
];

export function HowItWorks() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">For campaign stakeholders</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">How BankReach works</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          BankReach is a desk for one question: given what we know before we call, how likely is this customer to subscribe to a term deposit? The answer is an estimate that a person uses. It is not an approval and it is not a refusal.
        </p>
      </header>

      <section aria-label="Prediction pipeline" className="panel p-6">
        <ol className="space-y-0">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#163e35] to-spruce font-semibold text-white shadow-md shadow-spruce/20">{index + 1}</span>
                {index < STEPS.length - 1 ? <span className="w-px flex-1 bg-line" aria-hidden="true" /> : null}
              </div>
              <div className={index < STEPS.length - 1 ? "pb-6" : ""}>
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="panel p-5">
          <h2 className="font-serif text-2xl tracking-tight">Why this matters</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Campaign teams have limited time and resources. A shared estimate helps them decide which customers to contact first, instead of treating every profile as identical.
          </p>
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl tracking-tight">What the model does</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            It estimates the probability of subscription from customer, campaign, and economic information. The threshold then turns that probability into an outreach priority.
          </p>
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl tracking-tight">What the model does not do</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            It does not guarantee customer behaviour. It does not automatically make business decisions. It also does not use call length, because that is only known after the conversation has already happened.
          </p>
        </article>
      </section>

      <section className="panel p-6">
        <h2 className="font-serif text-2xl tracking-tight">On the campaign desk</h2>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <li>Score one customer, or upload a campaign file to score every row with the same model.</li>
          <li>Add the assessment to the call list. The order follows the estimated probability.</li>
          <li>Contact customers at or above the outreach line first. Keep the others for a later pass. Do not treat a lower priority as a refusal.</li>
        </ol>
        <p className="mt-4">
          <Link to="/call-list" className="text-sm font-semibold text-leaf underline-offset-4 hover:underline">
            Open today's call list
          </Link>
        </p>
      </section>

      <p>
        <Link
          to="/predict"
          className="inline-flex rounded-xl bg-gradient-to-br from-[#18a674] to-[#0c6d4c] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-leaf/25"
        >
          Start a prediction
        </Link>
      </p>
    </div>
  );
}
