import { FormEvent, useState } from "react";

export function ApplicationTracker() {
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Application support</p>
      <h1 className="page-title mt-2">Application Tracker</h1>
      <p className="page-copy">Use the official portal for live application status verification.</p>

      <form onSubmit={submit} className="panel mt-6">
        <div>
          <label className="label" htmlFor="reference">
            Application Reference Number
          </label>
          <input
            id="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="input"
            required
            placeholder="e.g. PASSPORT-2026-98124"
          />
        </div>
        <button className="primary-button mt-5">Find official status channel</button>
      </form>

      {submitted && (
        <div role="status" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
          <h2 className="font-bold text-slate-950 dark:text-amber-200">Official Portal Status Guidance</h2>
          <p className="mt-2 leading-6 text-slate-800 dark:text-amber-300">
            For security, reference number <strong className="font-mono text-amber-600 dark:text-amber-400">{reference}</strong> should be tracked directly on the administering government portal or official state helpdesk.
          </p>
        </div>
      )}

      <aside className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        <strong>Privacy notice:</strong> Never enter OTPs, passwords, bank credentials, Aadhaar numbers, or PAN numbers in public tracking inputs.
      </aside>
    </section>
  );
}

