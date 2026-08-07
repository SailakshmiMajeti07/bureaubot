import { Link } from "react-router-dom";

const services = [
  ["Passport", "Fresh passport, renewal, re-issue, and appointment guidance."],
  ["PAN and Aadhaar", "PAN services and UIDAI guidance."],
  ["Driving Licence", "Learner licence, renewal, replacement, and RTO service support."],
  ["Certificates", "Income, caste, and residence/domicile certificate guidance."],
  ["Scholarships", "National Scholarship Portal application guidance."],
  ["Farmer and welfare", "PM-KISAN, Ayushman Bharat, pensions, and ration cards."],
];

export function GovernmentServices() {
  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">India government services</p>
      <h1 className="page-title mt-2">Find the service you need</h1>
      <p className="page-copy">Browse popular services, then ask BureauBot for a workflow and official portal.</p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(([title, copy]) => (
          <article
            key={title}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-400"
          >
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Government service</span>
            <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
            <Link
              className="mt-5 inline-block font-semibold text-amber-600 group-hover:underline dark:text-amber-400"
              to={`/chat?question=${encodeURIComponent(`I need help with ${title}`)}`}
            >
              Get guidance -&gt;
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

