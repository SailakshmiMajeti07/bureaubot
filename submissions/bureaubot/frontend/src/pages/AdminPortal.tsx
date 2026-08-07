import { useEffect, useState } from "react";
import {
  AdminDashboardType,
  ApplicationType,
  getAdminApplicationsApi,
  getAdminDashboardApi,
  getAdminServicesApi,
  getAdminUsersApi,
  ServiceType,
  UserType,
} from "../lib/api";

export function AdminPortal() {
  const [stats, setStats] = useState<AdminDashboardType | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "services" | "applications">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true);
      setError(null);
      try {
        const [dashData, usersData, servicesData, appsData] = await Promise.all([
          getAdminDashboardApi().catch(() => null),
          getAdminUsersApi().catch(() => []),
          getAdminServicesApi().catch(() => []),
          getAdminApplicationsApi().catch(() => []),
        ]);
        setStats(dashData);
        setUsers(usersData);
        setServices(servicesData);
        setApplications(appsData);
      } catch (err: any) {
        setError(err.message || "Failed to load admin analytics.");
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading admin portal analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">🛡️ BureauBot Admin Portal</h1>
          <p className="page-copy">System-wide monitoring, user management, and service database configuration.</p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {(["overview", "users", "services", "applications"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === tab
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-2xl font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                👥
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Users</p>
                <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{stats?.total_users ?? users.length}</p>
              </div>
            </div>

            <div className="panel flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-2xl font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                🏛️
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Active Services</p>
                <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{stats?.active_services ?? services.length}</p>
              </div>
            </div>

            <div className="panel flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                📋
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Applications</p>
                <p className="text-2xl font-extrabold text-slate-950 dark:text-white">{stats?.total_applications ?? applications.length}</p>
              </div>
            </div>

            <div className="panel flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                ⚡
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">System Status</p>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">Optimal</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Recent Registered Users */}
            <div className="panel space-y-4">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Recent Users</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.slice(0, 5).map((u) => (
                  <li key={u.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{u.email}</p>
                      <p className="text-xs text-slate-500">{u.full_name || "No name set"}</p>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {u.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Active Services Catalogue */}
            <div className="panel space-y-4">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Configured Services</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {services.slice(0, 5).map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.category} • {s.state}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-500">{s.code}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="panel space-y-4">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">User Accounts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{u.email}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{u.full_name || "-"}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-600">Active</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="panel space-y-4">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">India Service Database Records</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-amber-500">{s.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{s.category}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{s.state}</td>
                    <td className="py-3 px-4">
                      <a href={s.official_portal_url} target="_blank" rel="noreferrer" className="text-xs text-amber-500 underline">
                        Official Site 🔗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <div className="panel space-y-4">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">All Applications</h2>
          {applications.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No applications registered in system.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Reference No</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Service ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{app.reference_number}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{app.user_id}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{app.service_id}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
