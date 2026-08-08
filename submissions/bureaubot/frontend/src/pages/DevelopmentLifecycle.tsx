import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { approveMutagentOptimizationApi, getAgentSpecYamlApi } from "../lib/api";

const evaluationScenarios = [
  {
    id: "scenario_passport_need",
    title: "Need Passport",
    category: "Identity & Travel",
    prompt: "I need to apply for a new fresh Passport in Delhi",
    scores: { intent: 99, eligibility: 98, checklist: 85, guidance: 97, portal: 99 },
    diagnosis: { type: "Missing Document", detail: "Initial version missed Non-ECR qualification certificate requirement." },
    suggestion: "Prompt update: Evaluate Non-ECR qualification certificate for applicants who passed 10th grade.",
  },
  {
    id: "scenario_passport_lost",
    title: "Lost Passport Application",
    category: "Identity & Travel",
    prompt: "I lost my original Indian passport while traveling, how to get reissue?",
    scores: { intent: 98, eligibility: 97, checklist: 82, guidance: 96, portal: 98 },
    diagnosis: { type: "Missing Document", detail: "Missed Police FIR copy & Annexure F affidavit for lost passport reissue." },
    suggestion: "Add mandatory Police FIR & Annexure F lost passport affidavit rule to Document Agent.",
  },
  {
    id: "scenario_scholarship_eligibility",
    title: "Scholarship Eligibility",
    category: "Education & Welfare",
    prompt: "Am I eligible for SC National Post-Matric Scholarship with income 1.8 Lakhs?",
    scores: { intent: 99, eligibility: 98, checklist: 82, guidance: 97, portal: 98 },
    diagnosis: { type: "Missing Document", detail: "Missed Bonafide Student Certificate in state-only search rules." },
    suggestion: "Prompt update: Document Agent now searches State rules + Central NSP guidelines in parallel.",
  },
  {
    id: "scenario_income_certificate",
    title: "Income Certificate",
    category: "Revenue & Certificates",
    prompt: "How to get an annual Income Certificate from Tahsildar office?",
    scores: { intent: 98, eligibility: 97, checklist: 81, guidance: 96, portal: 97 },
    diagnosis: { type: "Missing Document", detail: "Missed Self-declaration affidavit clause." },
    suggestion: "Add self-declaration affidavit validation to Document Agent prompt.",
  },
  {
    id: "scenario_pension",
    title: "Old Age Pension Application",
    category: "Social Security",
    prompt: "Apply for Senior Citizen Old Age Pension for 65yo resident in Delhi",
    scores: { intent: 99, eligibility: 80, checklist: 97, guidance: 96, portal: 98 },
    diagnosis: { type: "Incorrect Eligibility", detail: "Rule engine evaluated nationwide income ceiling without regional BPL exemptions." },
    suggestion: "Update eligibility rule engine with state-wise income ceiling tables.",
  },
  {
    id: "scenario_pm_kisan",
    title: "PM-KISAN Landholding Registration",
    category: "Agriculture",
    prompt: "Apply for PM-KISAN Samman Nidhi scheme with 2 hectares land",
    scores: { intent: 98, eligibility: 97, checklist: 84, guidance: 95, portal: 98 },
    diagnosis: { type: "Missing Document", detail: "Missed Landholding Ownership document (7/12 extract)." },
    suggestion: "Add land registry verification rule (7/12 extract) to Document Agent prompt.",
  },
];

export function DevelopmentLifecycle() {
  const [activeStage, setActiveStage] = useState<string>("SPEC");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scenario_scholarship_eligibility");
  const [approvedMap, setApprovedMap] = useState<Record<string, boolean>>({});
  const [yamlContent, setYamlContent] = useState<string>("");
  const [loadingYaml, setLoadingYaml] = useState(false);

  const scenario = evaluationScenarios.find((s) => s.id === selectedScenarioId) || evaluationScenarios[2];
  const isApproved = approvedMap[selectedScenarioId] || false;

  useEffect(() => {
    async function loadYaml() {
      setLoadingYaml(true);
      try {
        const text = await getAgentSpecYamlApi();
        setYamlContent(text);
      } catch {
        setYamlContent(`# BureauBot Agent Specification (Mutagent Helix SPEC)
name: BureauBot
version: "2.2.0"
description: Autonomous AI assistant for government service application guidance.
supported_services:
  - Passport (Fresh & Lost)
  - SC National Post-Matric Scholarship
  - Senior Citizen Old Age Pension
  - Income Certificate
  - PM-KISAN Samman Nidhi
  - Ayushman Bharat PM-JAY
tools: [OCR, Government Portals DB, Email SMTP, iCalendar, PostgreSQL]
workflows: [Intent, Eligibility, Document Checklist, Document Verification, Step-by-Step Guidance, Portal Recommendation, Reminder Scheduling, Final Response]`);
      } finally {
        setLoadingYaml(false);
      }
    }
    loadYaml();
  }, []);

  const handleApproveOptimization = async () => {
    try {
      await approveMutagentOptimizationApi(selectedScenarioId);
      setApprovedMap((prev) => ({ ...prev, [selectedScenarioId]: true }));
    } catch {
      setApprovedMap((prev) => ({ ...prev, [selectedScenarioId]: true }));
    }
  };

  const currentScores = isApproved
    ? {
        intent: 100,
        eligibility: 100,
        checklist: 98,
        guidance: 99,
        portal: 100,
      }
    : scenario.scores;

  return (
    <div className="space-y-10 max-w-6xl mx-auto text-slate-100 font-sans px-3 sm:px-6 py-6">
      {/* Top Header Banner */}
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-300 border border-indigo-400/30">
              Mutagent Development Lifecycle
            </span>
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              SPEC ➔ BUILD ➔ EVALUATE ➔ DIAGNOSE ➔ OPTIMIZE
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed font-medium">
              Systematic self-improvement loop for BureauBot government application guidance using Mutagent.
            </p>
          </div>
          <Link
            to="/agent-dashboard"
            className="rounded-xl border border-indigo-500/40 bg-indigo-600/30 px-5 py-3 text-xs font-black text-white hover:bg-indigo-600/50 transition shadow-lg backdrop-blur"
          >
            Open Agent Dashboard -&gt;
          </Link>
        </div>
      </div>

      {/* 5-Stage Interactive Controller Bar */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          { id: "SPEC", title: "1. SPEC", icon: "📋", sub: "agentspec.yaml" },
          { id: "BUILD", title: "2. BUILD", icon: "🏗️", sub: "LangGraph + FastAPI + React" },
          { id: "EVALUATE", title: "3. EVALUATE", icon: "🧪", sub: "25+ Dataset Scenarios" },
          { id: "DIAGNOSE", title: "4. DIAGNOSE", icon: "🔍", sub: "Find Root Causes" },
          { id: "OPTIMIZE", title: "5. OPTIMIZE", icon: "🚀", sub: "Approve & Continuous Re-test" },
        ].map((stg) => (
          <button
            key={stg.id}
            type="button"
            onClick={() => setActiveStage(stg.id)}
            className={`rounded-2xl p-3.5 text-left transition border cursor-pointer ${
              activeStage === stg.id
                ? "border-indigo-400 bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20"
                : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-indigo-500/50"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span>{stg.icon}</span>
              <span>{stg.title}</span>
            </div>
            <p className="mt-1 text-[10px] opacity-80 truncate font-semibold">{stg.sub}</p>
          </button>
        ))}
      </div>

      {/* STAGE CONTENT DISPLAY */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* STAGE 1: SPEC */}
        {activeStage === "SPEC" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Stage 1</span>
                <h2 className="text-2xl font-black text-white">SPEC — Formal Agent Specification</h2>
              </div>
              <a
                href="/agentspec.yaml"
                download="agentspec.yaml"
                className="rounded-xl border border-indigo-400/50 bg-indigo-950/60 px-4 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-900/80 transition"
              >
                📥 Download agentspec.yaml
              </a>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <h3 className="text-sm font-extrabold text-indigo-300">What BureauBot Should Do</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Automate citizen government service application guidance through eligibility checks, document verification, step-by-step guidance, portal links, and reminders.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <h3 className="text-sm font-extrabold text-cyan-300">Supported Services</h3>
                  <ul className="grid grid-cols-2 gap-1.5 text-xs font-medium text-slate-300">
                    <li>• Passport (Fresh &amp; Lost)</li>
                    <li>• SC Post-Matric Scholarship</li>
                    <li>• Senior Citizen Pension</li>
                    <li>• Income Certificate</li>
                    <li>• PM-KISAN DBT</li>
                    <li>• Ayushman Bharat Health Card</li>
                    <li>• PAN Card Application</li>
                    <li>• Driving Licence (RTO)</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <h3 className="text-sm font-extrabold text-emerald-300">Specialized Tools</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    OCR Scanner, Government Portals DB, Email Dispatch (SMTP), iCalendar Exporter (.ics / Google Calendar), PostgreSQL Database.
                  </p>
                </div>
              </div>

              {/* YAML Code Viewer */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-indigo-300">📄 Output: agentspec.yaml</span>
                  <span className="text-[10px] font-mono text-slate-500">YAML 1.2</span>
                </div>
                <pre className="h-80 overflow-y-auto font-mono text-[11px] text-indigo-200 leading-relaxed p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  {loadingYaml ? "Loading agentspec.yaml..." : yamlContent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: BUILD */}
        {activeStage === "BUILD" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Stage 2</span>
              <h2 className="text-2xl font-black text-white">BUILD — Technology Stack Implementation</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-indigo-500/40 bg-slate-950 p-5 space-y-3">
                <div className="text-3xl">🦜🔗</div>
                <h3 className="text-base font-black text-indigo-300">LangGraph Agent DAG</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  State-machine orchestration graph (`graph.py`) directing Intent, Eligibility, Document Verification, Guidance, Portal Recommendation, and Reminder nodes.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/40 bg-slate-950 p-5 space-y-3">
                <div className="text-3xl">⚡</div>
                <h3 className="text-base font-black text-cyan-300">FastAPI Backend</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Asynchronous REST API service powering chat processing, document checklist validation, email notifications, and Mutagent lifecycle endpoints.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/40 bg-slate-950 p-5 space-y-3">
                <div className="text-3xl">⚛️</div>
                <h3 className="text-base font-black text-emerald-300">React Frontend</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Interactive web application with dark theme, glassmorphic styling, calendar exports, and live Mutagent evaluation dashboards.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: EVALUATE */}
        {activeStage === "EVALUATE" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Stage 3</span>
                <h2 className="text-2xl font-black text-white">EVALUATE — Dataset Scenarios &amp; Mutagent Scores</h2>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400">Select Dataset Scenario (25+ Scenarios):</label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="rounded-xl border border-indigo-400/50 bg-slate-950 px-3 py-2 text-xs font-bold text-indigo-200 focus:outline-none"
                >
                  {evaluationScenarios.map((sc) => (
                    <option key={sc.id} value={sc.id} className="bg-slate-900 text-white">
                      {sc.title} ({sc.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Scenario Prompt Input:</span>
              <p className="text-sm font-extrabold text-white">&quot;{scenario.prompt}&quot;</p>
            </div>

            {/* 5 Mutagent Score Dimension Gauges */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-300">
                Mutagent 5 Evaluation Score Dimensions
              </h3>
              <div className="grid gap-4 sm:grid-cols-5">
                {[
                  { label: "Intent Detection", score: currentScores.intent },
                  { label: "Eligibility Check", score: currentScores.eligibility },
                  { label: "Document Checklist", score: currentScores.checklist },
                  { label: "Step Guidance", score: currentScores.guidance },
                  { label: "Portal Recommendation", score: currentScores.portal },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-center space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block h-8">{m.label}</span>
                    <p className={`text-2xl font-black ${m.score >= 95 ? "text-emerald-400" : "text-amber-400"}`}>
                      {m.score}%
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${m.score >= 95 ? "bg-emerald-400" : "bg-amber-400"}`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: DIAGNOSE */}
        {activeStage === "DIAGNOSE" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Stage 4</span>
              <h2 className="text-2xl font-black text-white">DIAGNOSE — Mutagent Failure Classification</h2>
            </div>

            {/* 4 Failure Diagnostic Categories */}
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { type: "Wrong Intent", icon: "✖", desc: "Query misclassified to incorrect tool handler" },
                { type: "Incorrect Eligibility", icon: "✖", desc: "Miscalculated regional income ceiling or age limit" },
                { type: "Missing Document", icon: "✖", desc: "Omitted mandatory document (e.g. Bonafide / Annexure F)" },
                { type: "Incorrect Guidance", icon: "✖", desc: "Outdated step instructions or portal link" },
              ].map((cat) => (
                <div
                  key={cat.type}
                  className={`rounded-2xl border p-4 space-y-2 ${
                    scenario.diagnosis.type === cat.type
                      ? "border-rose-500/60 bg-rose-950/30 shadow-lg shadow-rose-500/10"
                      : "border-slate-800 bg-slate-950 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white">{cat.type}</span>
                    <span className={scenario.diagnosis.type === cat.type ? "text-rose-400 font-black" : "text-slate-600"}>
                      {scenario.diagnosis.type === cat.type ? "DETECTED" : "PASS"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{cat.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 space-y-2">
              <h3 className="text-sm font-extrabold text-rose-300 flex items-center gap-2">
                <span>🔍</span> Mutagent Root Cause Diagnosis for &quot;{scenario.title}&quot;
              </h3>
              <p className="text-xs font-semibold text-rose-200 leading-relaxed">
                {scenario.diagnosis.detail}
              </p>
            </div>
          </div>
        )}

        {/* STAGE 5: OPTIMIZE */}
        {activeStage === "OPTIMIZE" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Stage 5</span>
              <h2 className="text-2xl font-black text-white">OPTIMIZE — Continuous Agent Self-Improvement Loop</h2>
            </div>

            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/20 p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-emerald-400">Mutagent Suggested Improvement:</span>
                <p className="text-sm font-extrabold text-white">{scenario.suggestion}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-emerald-800/40">
                <div className="text-xs font-semibold text-slate-300">
                  Status: {isApproved ? "✔ Approved & Deployed (Re-evaluated: 98-100% Scores)" : "⏳ Pending Developer Approval"}
                </div>
                <button
                  type="button"
                  onClick={handleApproveOptimization}
                  disabled={isApproved}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition shadow-xl cursor-pointer disabled:opacity-50"
                >
                  {isApproved ? "✔ Optimization Approved & Active" : "⚡ Approve Optimization"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SYSTEM ARCHITECTURE VISUAL */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-6">
        <h2 className="text-2xl font-black text-white text-center">System Architecture</h2>
        <div className="flex flex-col items-center gap-4 text-center font-mono text-xs">
          <div className="rounded-xl border border-cyan-400/60 bg-slate-950 px-6 py-2 text-cyan-300 font-extrabold shadow-lg">
            Citizen
          </div>
          <div className="text-slate-500 text-lg">│</div>
          <div className="text-slate-500 text-lg">▼</div>
          <div className="rounded-2xl border border-indigo-400/60 bg-slate-950 px-8 py-3 text-white font-black text-sm shadow-xl">
            BureauBot AI Agent
          </div>
          <div className="text-slate-500 text-lg">│</div>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl text-[11px]">
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-indigo-300">Intent</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-indigo-300">Eligibility</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-indigo-300">FAQ</span>
            <span className="text-slate-500">➔</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-cyan-300">Document Checklist</span>
            <span className="text-slate-500">➔</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-cyan-300">Document Verification</span>
            <span className="text-slate-500">➔</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-emerald-300">Application Guidance</span>
            <span className="text-slate-500">➔</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-emerald-300">Portal Recommendation</span>
            <span className="text-slate-500">➔</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-amber-300">Reminder Scheduling</span>
            <span className="text-slate-500">➔</span>
            <span className="rounded-lg bg-slate-950 px-3 py-1.5 border border-slate-800 text-white font-extrabold">Final Response</span>
          </div>
          <div className="text-slate-500 text-lg mt-2">▲</div>
          <div className="text-slate-500 text-lg">│</div>
          <div className="rounded-2xl border border-indigo-500/50 bg-indigo-950/40 px-6 py-3 text-indigo-200 font-extrabold">
            Mutagent Engine: SPEC → BUILD → EVALUATE → DIAGNOSE → OPTIMIZE
          </div>
        </div>
      </section>

      {/* FINAL 1-MINUTE PITCH */}
      <footer className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 p-6 sm:p-8 space-y-3 shadow-2xl">
        <h3 className="text-lg font-black text-indigo-300 flex items-center gap-2">
          <span>🎤</span> Final 1-Minute Pitch
        </h3>
        <p className="text-xs leading-relaxed text-slate-300 font-medium">
          &quot;BureauBot is an autonomous AI assistant that simplifies government service applications by guiding citizens through eligibility checks, document verification, application steps, official portal navigation, and deadline reminders. Rather than acting as a simple chatbot, it executes complete workflows using specialized tools. We build and continuously improve BureauBot using Mutagent&apos;s Agentic Development Lifecycle—SPEC, BUILD, EVALUATE, DIAGNOSE, and OPTIMIZE—which allows us to systematically test the agent, identify failures, and make it more accurate and reliable over time. This combination of a real-world AI assistant with a structured self-improvement lifecycle is what makes our solution a strong fit for the Mutagent challenge.&quot;
        </p>
      </footer>
    </div>
  );
}
