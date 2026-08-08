import React, { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BureauBotResponse, createUserReminderApi, postToBureauBot } from "../lib/api";
import { downloadIcsFile, getGoogleCalendarUrl } from "../lib/calendarUtils";

export function ChatAssistant() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<BureauBotResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reminder widget state inside response
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  useEffect(() => {
    setMessage(params.get("question") ?? "");
  }, [params]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setReminderSuccess(null);
    setLoading(true);
    try {
      const res = await postToBureauBot("/chat", { message, jurisdiction: "India" });
      setResult(res);
      // Persist user prompt and service in localStorage for Agent Dashboard & Mutagent Lifecycle
      try {
        localStorage.setItem("bureaubot_user_need", message);
        if (res.tool) {
          localStorage.setItem("bureaubot_active_service", res.tool);
        }
      } catch {
        // Ignore storage errors
      }
      // Pre-fill default reminder message
      setReminderMsg(`Reminder: Submit application for ${res.tool.replaceAll("_", " ").toUpperCase()}`);
    } catch (cause: any) {
      const errMsg = cause?.response?.data?.detail || cause?.message || "Unable to reach BureauBot service.";
      if (cause?.message === "Network Error" || !cause?.response) {
        setError("Network Error: Unable to connect to BureauBot backend server (http://127.0.0.1:8000). Please ensure backend server is running with 'python main.py'.");
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleScheduleReminder = async (e: FormEvent) => {
    e.preventDefault();
    if (!reminderDate) return;
    setReminderLoading(true);
    setReminderSuccess(null);
    try {
      await createUserReminderApi({
        message: reminderMsg || `Deadline reminder for ${result?.tool}`,
        scheduled_for: new Date(reminderDate).toISOString(),
      });
      setReminderSuccess("⏰ Deadline reminder successfully scheduled! Check your User Dashboard.");
      setShowReminderModal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Please log in to set application reminders.");
    } finally {
      setReminderLoading(false);
    }
  };

  const data = result?.result.data as
    | { workflow?: string[]; document_checklist?: string[]; eligibility_questions?: string[]; official_portal?: string }
    | undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Chat assistant</p>
        <h1 className="page-title mt-2">Ask about an Indian government service</h1>
        <p className="page-copy">
          Get step-by-step guidance, required document checklists, deadline reminders, and official portal links.
        </p>

        <form onSubmit={submit} className="panel mt-6">
          <label className="label" htmlFor="question">
            Your question
          </label>
          <textarea
            id="question"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (message.trim().length >= 3 && !loading) {
                  submit(event as any);
                }
              }
            }}
            required
            minLength={3}
            rows={4}
            className="input resize-y"
            placeholder="e.g. How do I apply for a fresh Passport? or What is needed for PM-KISAN? (Press Enter to send)"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Do not share sensitive credentials (Aadhaar, PAN numbers, OTPs, passwords).
            </p>
            <button disabled={loading} className="primary-button">
              {loading ? "Analyzing workflow..." : "Get guidance"}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
            ⚠️ {error}
          </p>
        )}

        {result && (
          <section className="mt-6 space-y-6">
            {/* Header Badge Card */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-950">
                    {result.tool.replaceAll("_", " ")}
                  </span>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-amber-200">{result.response}</h2>
                </div>
              </div>

              {result.escalation_required && (
                <div className="mt-3 rounded-lg border border-amber-400 bg-amber-100 p-3 text-xs font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
                  ⚠️ Notice: Official helpdesk verification recommended for this high-impact service.
                </div>
              )}
            </div>

            {/* 1. Step-by-Step Guidance Workflow FIRST */}
            {data?.workflow && (
              <div className="panel space-y-4 border-2 border-amber-400/40">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-400 font-bold text-slate-950 text-xs">1</span>
                  <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                    Step-by-Step Application Process
                  </h2>
                </div>
                <ol className="space-y-3">
                  {data.workflow.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-800 dark:text-slate-200">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 font-bold text-slate-950 text-xs mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="text-sm font-medium leading-relaxed">
                        <strong className="text-slate-950 dark:text-white">Step {idx + 1}:</strong> {step}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 2. Typical Required Documents */}
            {data?.document_checklist && (
              <div className="panel space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">📄 Required Documents</h2>
                  <Link
                    to={`/checklist?service=${encodeURIComponent(result.tool)}`}
                    className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
                  >
                    View Interactive Checklist -&gt;
                  </Link>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {data.document_checklist.map((doc, idx) => (
                    <li key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      <span className="text-amber-500">✓</span> {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. Questions to Prepare */}
            {data?.eligibility_questions && (
              <div className="panel space-y-3">
                <h2 className="text-base font-bold text-slate-950 dark:text-white">❓ Assessment Questions to Prepare</h2>
                <ul className="space-y-2">
                  {data.eligibility_questions.map((q, idx) => (
                    <li key={idx} className="rounded-lg bg-slate-50 p-2.5 text-xs font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      • {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reminder Success Notification */}
            {reminderSuccess && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 space-y-2">
                <p>{reminderSuccess}</p>
                {reminderDate && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => downloadIcsFile("Application Deadline Reminder", reminderMsg || `Deadline for ${result?.tool}`, reminderDate)}
                      className="rounded bg-emerald-800 px-3 py-1.5 text-white hover:bg-emerald-900 text-xs font-bold"
                    >
                      📅 Export .ics File (Apple / Outlook / Mobile)
                    </button>
                    <a
                      href={getGoogleCalendarUrl("Application Deadline Reminder", reminderMsg || `Deadline for ${result?.tool}`, reminderDate)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-800 text-xs font-bold inline-block"
                    >
                      📅 Open Google Calendar
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="panel flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">⏰ Application Deadline Reminder</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Set a reminder before the official application deadline so you don&apos;t miss it.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(!showReminderModal)}
                className="secondary-button text-xs font-bold"
              >
                {showReminderModal ? "Cancel" : "⏰ Set Deadline Reminder"}
              </button>
            </div>

            {/* Modal / Schedule Form */}
            {showReminderModal && (
              <form onSubmit={handleScheduleReminder} className="panel space-y-4 border-2 border-amber-400">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Schedule Deadline Reminder</h3>
                <div>
                  <label className="label text-xs">Reminder Note</label>
                  <input
                    type="text"
                    required
                    value={reminderMsg}
                    onChange={(e) => setReminderMsg(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Select Date &amp; Time Before Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReminderModal(false)}
                    className="secondary-button text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={reminderLoading} className="primary-button text-xs font-bold">
                    {reminderLoading ? "Scheduling..." : "Save Reminder"}
                  </button>
                </div>
              </form>
            )}

            {/* 5. Official Portal Link Button THEN Provided at the END */}
            {data?.official_portal && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Action Link</p>
                <h3 className="mt-1 text-base font-bold text-slate-950 dark:text-white">Ready to proceed with your application?</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 mb-4">
                  Open the official government web portal below to register or submit documents directly.
                </p>
                <a
                  className="primary-button py-3 px-6 text-base font-extrabold shadow-lg transition hover:scale-105"
                  href={data.official_portal}
                  target="_blank"
                  rel="noreferrer"
                >
                  Go to Official Government Portal 🔗
                </a>
              </div>
            )}

            {/* Sources & Citations */}
            {result.result.sources.length > 0 && (
              <div className="panel space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Official Portal Citations</h3>
                <ul className="space-y-1 text-xs">
                  {result.result.sources.map((src) => (
                    <li key={src.url}>
                      <a href={src.url} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline dark:text-amber-400 font-medium">
                        • {src.title} ({src.url})
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </section>

      <aside className="panel h-fit space-y-4">
        <h2 className="font-bold text-slate-950 dark:text-white">What BureauBot delivers</h2>
        <ul className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">1.</span> Step-by-step application guidance.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">2.</span> Required documents checklist.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">3.</span> Application deadline reminders.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">4.</span> Verified official government portals.
          </li>
        </ul>
      </aside>
    </div>
  );
}


