import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getServicesListApi, postToBureauBot, ServiceType } from "../lib/api";

const defaultServiceMap: Record<string, string[]> = {
  passport: [
    "Proof of Date of Birth (Birth Certificate or Matriculation Certificate)",
    "Proof of Identity (Aadhaar Card or PAN Card)",
    "Proof of Present Address (Utility bill, Rent agreement, or Bank Passbook)",
    "Non-ECR proof (Educational Qualification Certificate)",
    "Passport-size photographs with white background",
  ],
  pan: [
    "Proof of Identity (Aadhaar Card, Voter ID, or Driving Licence)",
    "Proof of Address (Aadhaar Card, Bank statement, or Electricity bill)",
    "Proof of Date of Birth (Birth Certificate, Aadhaar, or Matriculation Marksheet)",
    "Passport size photographs (2 copies)",
  ],
  aadhaar: [
    "Proof of Identity (PAN Card, Passport, or Voter ID)",
    "Proof of Address (Utility bill, Ration card, or Bank Statement)",
    "Proof of Date of Birth (Birth Certificate or SSLC Marksheet)",
  ],
  driving_licence: [
    "Valid Learner's Licence Number",
    "Proof of Age (School Certificate or Birth Certificate)",
    "Proof of Address (Aadhaar or Passport)",
    "Medical Certificate Form 1-A (for commercial licence or applicants over 40)",
    "Application Form 4 signed",
  ],
  income_certificate: [
    "Applicant Aadhaar Card",
    "Income Proof (Salary Certificate, Form 16, or Income Tax Return)",
    "Self-declaration affidavit",
    "Property tax receipt or Land revenue record",
    "Passport size photograph",
  ],
  scholarship: [
    "Student Identity Card & School/College Admission receipt",
    "Income Certificate of parents (Annual income ceiling compliance)",
    "Caste Certificate (if applying under SC/ST/OBC category)",
    "Previous academic marksheets (Minimum 50% or qualification marks)",
    "Active Bank Account Passbook linked to Aadhaar",
  ],
  pm_kisan: [
    "Landholding ownership document (7/12 extract or Khasra/Khatauni)",
    "Aadhaar Card linked with active Mobile Number",
    "Bank Account Passbook (Direct Benefit Transfer enabled)",
    "Category / Citizenship Certificate",
  ],
  ayushman_bharat: [
    "Aadhaar Card or Ration Card",
    "SECC 2011 Household Registration Evidence or PM-JAY Letter",
    "Active Mobile Number for OTP verification",
  ],
  ration_card: [
    "Aadhaar Cards of all family members",
    "Proof of Residence (Electricity bill or Water bill)",
    "Family head passport photograph",
    "Income Certificate of family",
  ],
};

export function DocumentChecklist() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("service")?.toLowerCase() || "passport";

  const [selectedServiceCode, setSelectedServiceCode] = useState<string>(initialCode);
  const [servicesList, setServicesList] = useState<ServiceType[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [checkedDocs, setCheckedDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch services list on mount
  useEffect(() => {
    async function loadServices() {
      try {
        const list = await getServicesListApi();
        setServicesList(list);
      } catch {
        // Fallback silently if offline
      }
    }
    loadServices();
  }, []);

  // Fetch document checklist whenever selected service changes
  useEffect(() => {
    async function fetchDocs() {
      setLoading(true);
      setCheckedDocs([]);
      try {
        const res = await postToBureauBot("/documents", {
          service_code: selectedServiceCode,
          jurisdiction: "India",
        });
        const docs = (res.result.data.required_documents as string[]) || (res.result.data.document_checklist as string[]) || [];
        if (docs.length > 0) {
          setRequiredDocs(docs);
        } else {
          setRequiredDocs(defaultServiceMap[selectedServiceCode] || defaultServiceMap["passport"]);
        }
      } catch {
        setRequiredDocs(defaultServiceMap[selectedServiceCode] || defaultServiceMap["passport"]);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [selectedServiceCode]);

  const readyCount = useMemo(() => checkedDocs.length, [checkedDocs]);
  const totalCount = requiredDocs.length;
  const progressPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  function toggleDoc(docItem: string) {
    setCheckedDocs((prev) => (prev.includes(docItem) ? prev.filter((d) => d !== docItem) : [...prev, docItem]));
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Application preparation</p>
        <h1 className="page-title mt-1">Service Document Checklist</h1>
        <p className="page-copy">Select an Indian government service to view ONLY the specific required documents for that application.</p>
      </div>

      {/* Service Selector Dropdown */}
      <div className="panel space-y-2 border-2 border-amber-400/40">
        <label className="label text-sm font-bold text-slate-900 dark:text-white">
          Select Government Service:
        </label>
        <select
          value={selectedServiceCode}
          onChange={(e) => setSelectedServiceCode(e.target.value.toLowerCase())}
          className="input font-semibold text-base cursor-pointer"
        >
          {servicesList.length > 0
            ? servicesList.map((s) => (
                <option key={s.code} value={s.code.toLowerCase()} className="dark:bg-slate-900 dark:text-white">
                  {s.name} ({s.code.toUpperCase()})
                </option>
              ))
            : [
                ["passport", "Passport Seva"],
                ["pan", "PAN Card Application"],
                ["aadhaar", "Aadhaar Card Updates"],
                ["driving_licence", "Driving Licence / RTO"],
                ["income_certificate", "Income Certificate"],
                ["scholarship", "National Scholarship Scheme"],
                ["pm_kisan", "PM-KISAN Samman Nidhi"],
                ["ayushman_bharat", "Ayushman Bharat PM-JAY"],
                ["ration_card", "Ration Card / NFSA"],
              ].map(([code, label]) => (
                <option key={code} value={code} className="dark:bg-slate-900 dark:text-white">
                  {label}
                </option>
              ))}
        </select>
      </div>

      {/* Preparation Panel */}
      <div className="panel space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Required Documents for {selectedServiceCode.replaceAll("_", " ").toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mark each document as you collect it.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-400/20 px-3.5 py-1 text-sm font-extrabold text-amber-800 dark:text-amber-300">
              {readyCount} of {totalCount} Ready ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm font-semibold text-slate-500">
            Fetching official document requirements...
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requiredDocs.map((docItem, idx) => (
              <label key={idx} className="flex cursor-pointer items-start gap-4 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 rounded-lg px-2 transition">
                <input
                  type="checkbox"
                  checked={checkedDocs.includes(docItem)}
                  onChange={() => toggleDoc(docItem)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <div className="space-y-0.5">
                  <span className={checkedDocs.includes(docItem) ? "text-slate-400 line-through dark:text-slate-600 text-sm font-medium" : "text-sm font-semibold text-slate-900 dark:text-slate-100"}>
                    {docItem}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ensure document copy is self-attested and clearly legible.</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <aside className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        <strong>Privacy &amp; Security Note:</strong> Check that documents are current and issued by official state/central authorities. Never share sensitive OTPs or passwords.
      </aside>
    </section>
  );
}



