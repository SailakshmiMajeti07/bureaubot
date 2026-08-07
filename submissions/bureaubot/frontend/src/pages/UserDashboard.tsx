import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChatHistoryType,
  createUserReminderApi,
  DocumentType,
  getUserChatHistoryApi,
  getUserDocumentsApi,
  getUserRemindersApi,
  ReminderType,
} from "../lib/api";
import { downloadIcsFile, getGoogleCalendarUrl } from "../lib/calendarUtils";
import { formatDateTime } from "../lib/dateUtils";

export function UserDashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [reminders, setReminders] = useState<ReminderType[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New reminder form
  const [newReminderMsg, setNewReminderMsg] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [submittingReminder, setSubmittingReminder] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      setError(null);
      try {
        const [docs, rems, chats] = await Promise.all([
          getUserDocumentsApi().catch(() => []),
          getUserRemindersApi().catch(() => []),
          getUserChatHistoryApi().catch(() => []),
        ]);
        setDocuments(docs);
        setReminders(rems);
        setChatHistory(chats);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, []);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderMsg.trim() || !newReminderDate) return;
    setSubmittingReminder(true);
    try {
      const created = await createUserReminderApi({
        message: newReminderMsg.trim(),
        scheduled_for: new Date(newReminderDate).toISOString(),
      });
      setReminders((prev) => [created, ...prev]);
      setNewReminderMsg("");
      setNewReminderDate("");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create reminder.");
    } finally {
      setSubmittingReminder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading user dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-400 font-extrabold text-2xl text-slate-950 shadow-md">
              {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                Welcome, {user?.full_name || user?.email.split("@")[0]}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-400/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {user?.role} Account
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Grid Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Reminders Panel */}
        <div className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">⏰ Application Reminders</h2>
            <span className="text-xs font-semibold text-slate-500">{reminders.length} scheduled</span>
          </div>

          <form onSubmit={handleCreateReminder} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
            <input
              type="text"
              required
              value={newReminderMsg}
              onChange={(e) => setNewReminderMsg(e.target.value)}
              placeholder="Reminder message (e.g. Passport appointment slot)"
              className="input text-sm"
            />
            <div className="flex gap-2">
              <input
                type="datetime-local"
                required
                value={newReminderDate}
                onChange={(e) => setNewReminderDate(e.target.value)}
                className="input text-sm"
              />
              <button type="submit" disabled={submittingReminder} className="primary-button text-sm whitespace-nowrap">
                + Add
              </button>
            </div>
          </form>

          {reminders.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No scheduled reminders found.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {reminders.map((rem) => (
                <li key={rem.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rem.message}</p>
                    <p className="text-xs font-mono text-slate-500">{formatDateTime(rem.scheduled_for)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadIcsFile("BureauBot Application Reminder", rem.message, rem.scheduled_for)}
                      className="rounded bg-amber-400 px-2 py-1 text-[10px] font-extrabold text-slate-950 hover:bg-amber-300"
                      title="Download .ics Calendar File"
                    >
                      📅 .ics
                    </button>
                    <a
                      href={getGoogleCalendarUrl("BureauBot Application Reminder", rem.message, rem.scheduled_for)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-amber-400 hover:bg-slate-700"
                      title="Add to Google Calendar"
                    >
                      📅 Google
                    </a>
                    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {rem.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Documents Panel */}
        <div className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">📄 My Uploaded Documents</h2>
            <span className="text-xs font-semibold text-slate-500">{documents.length} files</span>
          </div>

          {documents.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <p>No documents uploaded yet.</p>
              <Link to="/checklist" className="mt-2 inline-block font-semibold text-amber-500 hover:underline">
                Upload &amp; verify documents
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <li key={doc.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.file_name}</p>
                    <p className="text-xs text-slate-500">{doc.document_type}</p>
                  </div>
                  <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {doc.verification_status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Chat History */}
      <div className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">💬 Recent Chat Interactions</h2>
          <Link to="/chat" className="text-xs font-bold text-amber-500 hover:underline">
            Open Chat Assistant -&gt;
          </Link>
        </div>

        {chatHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No previous chat interactions recorded.</p>
        ) : (
          <div className="space-y-3">
            {chatHistory.slice(0, 5).map((chat) => (
              <div key={chat.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {chat.intent}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{formatDateTime(chat.created_at)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Q: {chat.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
