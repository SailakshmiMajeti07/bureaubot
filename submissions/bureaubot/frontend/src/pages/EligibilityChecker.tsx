import { FormEvent, useState } from "react";
import { BureauBotResponse, postToBureauBot } from "../lib/api";

const services = [
  "Passport",
  "PAN",
  "Aadhaar",
  "Driving Licence",
  "Income Certificate",
  "Caste Certificate",
  "Residence Certificate",
  "Scholarship",
  "PM-KISAN",
  "Ayushman Bharat",
  "Pension",
  "Ration Card",
];

export function EligibilityChecker() {
  const [service, setService] = useState(services[0]);
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<BureauBotResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setResult(await postToBureauBot("/eligibility", { message: details || `I need guidance for ${service}`, service, jurisdiction: "India" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to check guidance.");
    } finally {
      setLoading(false);
    }
  }

  const questions = (result?.result.data.eligibility_questions as string[] | undefined) ?? [];

  return (
    <section className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Eligibility preparation</p>
      <h1 className="page-title mt-2">Prepare for an official assessment</h1>
      <p className="page-copy">BureauBot helps you gather the right questions. Only the responsible government authority can decide eligibility.</p>

      <form className="panel mt-6 space-y-5" onSubmit={submit}>
        <div>
          <label className="label">Service</label>
          <select className="input cursor-pointer" value={service} onChange={(event) => setService(event.target.value)}>
            {services.map((item) => (
              <option key={item} value={item} className="dark:bg-slate-900 dark:text-white">
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">What would you like to know?</label>
          <textarea
            className="input"
            rows={4}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="For example: I want to understand the steps for a scholarship application."
          />
        </div>

        <button disabled={loading} className="primary-button">
          {loading ? "Preparing..." : "Prepare questions"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          ⚠️ {error}
        </p>
      )}

      {result && (
        <div className="panel mt-6">
          <h2 className="font-bold text-slate-950 dark:text-white">Questions to take to the official service</h2>
          <ul className="mt-4 space-y-3">
            {questions.map((question) => (
              <li key={question} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                • {question}
              </li>
            ))}
          </ul>
          {result.result.warnings.length > 0 && (
            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">⚠️ {result.result.warnings[0]}</p>
          )}
        </div>
      )}
    </section>
  );
}

