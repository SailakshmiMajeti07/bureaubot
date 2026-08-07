import { Link } from "react-router-dom";

const actions = [
  { title: "Chat with BureauBot", copy: "Ask about Indian government services in plain language.", to: "/chat", mark: "01" },
  { title: "Check eligibility questions", copy: "Prepare the details an official scheme may need.", to: "/eligibility", mark: "02" },
  { title: "Prepare documents", copy: "Build a practical checklist before you apply.", to: "/checklist", mark: "03" },
];

export function Home() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-bureau-900 to-bureau-700 px-6 py-12 text-white shadow-lg sm:px-10 sm:py-16">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">India service navigator</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Make your next government service application easier to understand.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-sky-100">
          Find the right official portal, see typical document requirements, and understand the next step for services across India.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/chat" className="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300">
            Start a conversation
          </Link>
          <Link to="/services" className="rounded-lg border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10">
            Browse services
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Get started</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-400">A simple path from question to official next step.</p>
          </div>
          <span className="hidden rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold text-amber-800 dark:text-amber-300 sm:block">
            Guidance, not a government decision
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-400"
            >
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{action.mark}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">{action.title}</h3>
              <p className="mt-2 leading-6 text-slate-600 dark:text-slate-400">{action.copy}</p>
              <span className="mt-5 inline-block font-semibold text-amber-600 group-hover:underline dark:text-amber-400">
                Continue -&gt;
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="panel">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Popular services</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Passport", "PAN", "Aadhaar", "Driving Licence", "Scholarships", "PM-KISAN", "Ayushman Bharat", "Ration Card"].map((item) => (
              <Link
                key={item}
                to={`/chat?question=${encodeURIComponent(`How do I apply for ${item}?`)}`}
                className="rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-amber-400 dark:hover:text-slate-950"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40">
          <h2 className="font-bold text-amber-950 dark:text-amber-300">Protect your information</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-400">
            Never paste Aadhaar or PAN numbers, OTPs, bank details, passwords, or another person&apos;s application information into a chat.
          </p>
        </aside>
      </section>
    </div>
  );
}

