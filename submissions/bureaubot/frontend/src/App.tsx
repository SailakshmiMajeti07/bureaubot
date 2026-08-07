import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { AdminPortal } from "./pages/AdminPortal";
import { ApplicationTracker } from "./pages/ApplicationTracker";
import { ChatAssistant } from "./pages/ChatAssistant";
import { DocumentChecklist } from "./pages/DocumentChecklist";
import { EligibilityChecker } from "./pages/EligibilityChecker";
import { GovernmentServices } from "./pages/GovernmentServices";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { UserDashboard } from "./pages/UserDashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<ChatAssistant />} />
        <Route path="/services" element={<GovernmentServices />} />
        <Route path="/eligibility" element={<EligibilityChecker />} />
        <Route path="/checklist" element={<DocumentChecklist />} />
        <Route path="/tracker" element={<ApplicationTracker />} />

        {/* User Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<UserDashboard />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPortal />} />
        </Route>
      </Route>
    </Routes>
  );
}

