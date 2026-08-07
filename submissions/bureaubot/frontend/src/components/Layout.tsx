import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserRemindersApi, ReminderType } from "../lib/api";
import { downloadIcsFile, getGoogleCalendarUrl } from "../lib/calendarUtils";
import { formatDateTime } from "../lib/dateUtils";

export function Layout() {
  const { user, isAuthenticated, logout, theme, toggleTheme } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Notification Engine State
  const [reminders, setReminders] = useState<ReminderType[]>([]);
  const [dueReminders, setDueReminders] = useState<ReminderType[]>([]);
  const [activeAlert, setActiveAlert] = useState<ReminderType | null>(null);
  const [popupModalReminder, setPopupModalReminder] = useState<ReminderType | null>(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Poll reminders every 10 seconds when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setReminders([]);
      setDueReminders([]);
      setActiveAlert(null);
      setPopupModalReminder(null);
      return;
    }

    async function checkReminders() {
      try {
        const list = await getUserRemindersApi();
        setReminders(list);

        const now = Date.now();
        const triggered = list.filter((r) => {
          const schedTime = new Date(r.scheduled_for).getTime();
          return schedTime <= now;
        });

        setDueReminders(triggered);

        if (triggered.length > 0) {
          const newest = triggered[0];
          setActiveAlert(newest);

          const popupKey = `bureaubot_popup_${newest.id}`;
          if (!sessionStorage.getItem(popupKey)) {
            sessionStorage.setItem(popupKey, "true");
            setPopupModalReminder(newest);
          }

          // Trigger native browser notification if permitted
          if ("Notification" in window && Notification.permission === "granted") {
            const notifiedKey = `bureaubot_notified_${newest.id}`;
            if (!sessionStorage.getItem(notifiedKey)) {
              sessionStorage.setItem(notifiedKey, "true");
              new Notification("⏰ BureauBot Application Reminder", {
                body: `${newest.message} (Email sent to ${user?.email})`,
                icon: "/favicon.ico",
              });
            }
          }
        }
      } catch {
        // Silent fail on background polling
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.email]);

  const mainNavigation = [
    ["/", "Home"],
    ["/services", "Services"],
    ["/chat", "Chat Assistant"],
    ["/eligibility", "Eligibility"],
    ["/checklist", "Documents"],
    ["/tracker", "Tracker"],
    ...(isAuthenticated ? [["/dashboard", "User Dashboard"]] : []),
  ] as const;

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-amber-400 focus:px-4 focus:py-2 focus:font-bold focus:text-slate-950"
      >
        Skip to main content
      </a>

      {/* Modal On-Screen Pop-Up Dialog Alert */}
      {popupModalReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border-2 border-amber-400 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-bounce">⏰</span>
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">REMINDER ALERT!</h3>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Scheduled Application Deadline Reached</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPopupModalReminder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 dark:bg-slate-950 dark:border-slate-800 space-y-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{popupModalReminder.message}</p>
              <p className="text-xs font-mono text-slate-500">Scheduled for: {formatDateTime(popupModalReminder.scheduled_for)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <span>📧</span>
              <span>
                Automated reminder email sent to: <strong>{user?.email || "logged-in resident"}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadIcsFile("BureauBot Application Reminder", popupModalReminder.message, popupModalReminder.scheduled_for)}
                className="rounded bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                📅 Save .ics File
              </button>
              <a
                href={getGoogleCalendarUrl("BureauBot Application Reminder", popupModalReminder.message, popupModalReminder.scheduled_for)}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-slate-800 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-slate-700 inline-block"
              >
                📅 Google Calendar
              </a>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                to="/dashboard"
                onClick={() => setPopupModalReminder(null)}
                className="primary-button text-xs font-bold"
              >
                Open Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setPopupModalReminder(null)}
                className="secondary-button text-xs font-bold"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Triggered Reminder Notification Banner */}
      {activeAlert && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2.5 shadow-lg border-b border-amber-500">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-bold">
            <div className="flex items-center gap-2">
              <span className="animate-bounce text-base">⏰</span>
              <span>
                <strong>REMINDER ALERT:</strong> {activeAlert.message} (Scheduled for {formatDateTime(activeAlert.scheduled_for)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="rounded bg-slate-950 px-3 py-1 text-white hover:bg-slate-800 text-xs">
                View in Dashboard
              </Link>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className="rounded border border-slate-950/40 px-2 py-0.5 text-xs hover:bg-amber-500"
              >
                Dismiss ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 focus:outline-none">
              <span
                aria-hidden="true"
                className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-xl font-black text-slate-950 shadow-lg shadow-amber-500/20"
              >
                B
              </span>
              <div>
                <span className="block text-xl font-extrabold tracking-tight text-white">BureauBot</span>
                <span className="block text-xs font-medium text-amber-400">India Resident Gateway</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex md:items-center md:gap-1">
              {mainNavigation.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-amber-400 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right Controls: Theme Toggle, Notifications & User Auth */}
            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-amber-400 focus:outline-none"
                title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>

              {/* Notification Bell Icon */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                    className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-amber-400 focus:outline-none"
                    title="Reminders & Notifications"
                  >
                    🔔
                    {dueReminders.length > 0 && (
                      <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-extrabold text-white animate-pulse">
                        {dueReminders.length}
                      </span>
                    )}
                  </button>

                  {showNotificationsDropdown && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-xl z-50">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-xs font-bold uppercase text-amber-400">Scheduled Reminders</h4>
                        <span className="text-[10px] text-slate-400">{reminders.length} total</span>
                      </div>
                      {reminders.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">No scheduled reminders.</p>
                      ) : (
                        <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-slate-800 space-y-2">
                          {reminders.map((r) => {
                            const isDue = new Date(r.scheduled_for).getTime() <= Date.now();
                            return (
                              <div key={r.id} className="pt-2 text-xs">
                                <p className={`font-semibold ${isDue ? "text-amber-400" : "text-slate-200"}`}>{r.message}</p>
                                <p className="text-[10px] text-slate-400">{formatDateTime(r.scheduled_for)}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* User Dropdown / Auth Buttons */}
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900 p-1.5 pr-3 text-left transition hover:bg-slate-800 focus:outline-none"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-400 font-bold text-slate-950">
                      {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </span>
                    <span className="hidden text-sm font-semibold text-slate-200 lg:block">
                      {user.full_name || user.email.split("@")[0]}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {user.role}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-xl dark:border-slate-800">
                      <div className="border-b border-slate-800 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-400">Signed in as</p>
                        <p className="truncate text-sm font-bold text-white">{user.email}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        👤 User Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 md:hidden"
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {mainNavigation.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:bg-slate-800"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 text-sm text-slate-600 dark:text-slate-400 sm:px-6 md:grid-cols-2 lg:px-8">
          <p>
            <strong className="text-slate-900 dark:text-slate-100">BureauBot</strong> provides guidance and links to government services. It is not an official decision-making service.
          </p>
          <p className="md:text-right">Do not share Aadhaar, PAN, bank details, passwords, or OTPs in chat.</p>
        </div>
      </footer>
    </div>
  );
}
