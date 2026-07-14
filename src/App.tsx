import { useState, useEffect, useMemo, useLayoutEffect, useRef, memo, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  Key,
  Cloud,
  Database,
  FileSignature,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Download,
  Printer,
  Copy,
  RotateCcw,
  Lock,
  Unlock,
  LogOut,
  ChevronLeft,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Info,
  Calculator,
  UserCheck,
  UserX,
  FileSignature as SignatureIcon,
  Inbox,
  ChartLine,
  Send
} from "lucide-react";
import { SalaryRecord, UserRole, ChangeRequest } from "./types";

const ALL_TRACKS = [
  "קודש",
  "חובה",
  "חנ\"מ והו\"מ",
  "גננות",
  "אדריכלות",
  "גרפיקה",
  "מיסים וחשבונאות"
];

const INITIAL_PASSWORDS = {
  director: "צפורה",
  secretary: "שרייבר",
  coordinators: {
    "קודש": "קודש",
    "חובה": "חובה",
    "חנ\"מ והו\"מ": "חנ\"מ",
    "גננות": "גננות",
    "אדריכלות": "אדריכלות",
    "גרפיקה": "גרפיקה",
    "מיסים וחשבונאות": "מיסים"
  } as Record<string, string>
};

const TRACKS_BUDGET_LIMITS: Record<string, number> = {
  "קודש": 150000,
  "חובה": 120000,
  "חנ\"מ והו\"מ": 180000,
  "גננות": 80000,
  "אדריכלות": 100000,
  "גרפיקה": 90000,
  "מיסים וחשבונאות": 110000
};

const MONTH_KEYS = ["sep", "oct", "nov", "dec", "jan", "feb", "mar", "apr", "may", "jun", "jul"] as const;
const MONTH_LABELS = ["ספט'", "אוק'", "נוב'", "דצמ'", "ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יוני", "יולי"];

const SEMESTER_OPTIONS = [
  "שנתי",
  "מקצוע במחצית א'",
  "מקצוע במחצית ב'",
  "קורס במחצית א'",
  "קורס במחצית ב'",
];

const GRADE_TIMING_OPTIONS = [
  "ציון אחד בסוף שנה",
  "ציון בכל מחצית",
  "ציון בסיום קורס",
  "ללא ציון",
];

const formatSemesterDisplay = (semester: string) =>
  (semester || "שנתי").replace(/סמסטר/g, "מחצית");

const formatGradeTimingDisplay = (gradeTiming?: string) => {
  if (!gradeTiming || gradeTiming.includes("ללא ציון")) return "";
  return gradeTiming.replace(/סמסטר/g, "מחצית").replace(" (סדנה/ערב)", "");
};

/** מנרמל שם מסלול להשוואה יציבה (מרכאות/רווחים שונים) */
const normalizeTrack = (track: string) =>
  (track || "")
    .trim()
    .replace(/[״"''׳]/g, '"')
    .replace(/\s+/g, " ");

/** דיווח ביצוע חודשי: כל צורות התשלום מלבד תקן */
const isExecutionEligible = (paymentMethod: string) =>
  paymentMethod !== "תקן";

const getPaymentMethodBadgeClass = (paymentMethod: string) => {
  if (paymentMethod === "תקן") {
    return "bg-violet-50 text-violet-800 border border-violet-200";
  }
  if (paymentMethod === "שכר מרצים") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  }
  // קבלה + קבלת פטור — אותו צבע שלישי
  return "bg-amber-50 text-amber-800 border border-amber-200";
};

/** מקטין את גודל הטקסט בתא עד שהמלל נכנס לרוחב העמודה — לכל תא בנפרד */
const AutoFitCellText = memo(function AutoFitCellText({
  children,
  className = "",
  align = "right",
  maxFontSize = 11,
  minFontSize = 7,
  maxLines = 2,
}: {
  children: ReactNode;
  className?: string;
  align?: "right" | "center" | "left";
  maxFontSize?: number;
  minFontSize?: number;
  maxLines?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  const text =
    children === null || children === undefined
      ? ""
      : typeof children === "string" || typeof children === "number"
      ? String(children)
      : null;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || text === null) return;

    const fit = () => {
      if (container.clientWidth <= 0) return;

      let size = maxFontSize;
      const lineHeight = 1.2;

      while (size >= minFontSize) {
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = String(lineHeight);
        const maxHeight = size * lineHeight * maxLines + 1;
        const fitsWidth = el.scrollWidth <= container.clientWidth + 1;
        const fitsHeight = el.scrollHeight <= maxHeight;
        if (fitsWidth && fitsHeight) {
          setFontSize(size);
          return;
        }
        size -= 0.5;
      }

      setFontSize(minFontSize);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text, maxFontSize, minFontSize, maxLines]);

  if (text === null) {
    return <>{children}</>;
  }

  const alignClass =
    align === "center" ? "text-center" : align === "left" ? "text-left" : "text-right";

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 max-w-full overflow-hidden ${alignClass} ${className}`}
    >
      <span
        ref={textRef}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
        className="block w-full break-words leading-tight"
        title={text || undefined}
      >
        {text || "—"}
      </span>
    </div>
  );
});

export default function App() {
  // Authentication & Role State
  const [role, setRole] = useState<UserRole>("guest");
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [passwords, setPasswords] = useState(INITIAL_PASSWORDS);
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState<UserRole | null>(null);
  const [pendingTrackSwitch, setPendingTrackSwitch] = useState<string | null>(null);

  // Database Connection State
  const [dbMode, setDbMode] = useState<"cloud" | "local">("local");
  const [customDbUrl, setCustomDbUrl] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
  const [cloudConnectionStyle, setCloudConnectionStyle] = useState<"express" | "direct" | "none">("none");
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string; type: "success" | "error" | "warning" } | null>(null);

  // Records and Data State
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeEditingId, setActiveEditingId] = useState<number | null>(null);

  // Form Editing Buffers
  const [editTrack, setEditTrack] = useState("");
  const [editYear, setEditYear] = useState("יג");
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSemester, setEditSemester] = useState("שנתי");
  const [editPaymentMethod, setEditPaymentMethod] = useState("שכר מרצים");
  const [editShash, setEditShash] = useState(0);
  const [editMeetings, setEditMeetings] = useState(0);
  const [editRate, setEditRate] = useState(0);
  const [editTz, setEditTz] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTravel, setEditTravel] = useState("בית שמש");
  const [editGradeTiming, setEditGradeTiming] = useState("ציון אחד בסוף שנה");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrack, setFilterTrack] = useState("all");
  const [filterJobType, setFilterJobType] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals visibility state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCoordSelectModal, setShowCoordSelectModal] = useState(false);
  const [showPasswordsHelperModal, setShowPasswordsHelperModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [activeContractRecord, setActiveContractRecord] = useState<SalaryRecord | null>(null);
  const [showFinalReportModal, setShowFinalReportModal] = useState(false);

  // Change requests & execution view state
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simulatingRow, setSimulatingRow] = useState<SalaryRecord | null>(null);
  const [simName, setSimName] = useState("");
  const [simSubject, setSimSubject] = useState("");
  const [simSemester, setSimSemester] = useState("שנתי");
  const [simPaymentMethod, setSimPaymentMethod] = useState("שכר מרצים");
  const [simShash, setSimShash] = useState(0);
  const [simMeetings, setSimMeetings] = useState(0);
  const [simRate, setSimRate] = useState(0);
  const [simTravel, setSimTravel] = useState("בית שמש");
  const [showRequestsQueueModal, setShowRequestsQueueModal] = useState(false);
  const [isExecutionViewActive, setIsExecutionViewActive] = useState(false);

  // End-of-year permanent wipe (Director only, requires typed confirmation)
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const WIPE_CONFIRM_PHRASE = "נמחק לצמיתות";

  // Inline add vs modal edit: activeEditingId is the inline draft row (id<0);
  // editModalId is the pop-up modal used to edit an existing row (id>0).
  const [editModalId, setEditModalId] = useState<number | null>(null);

  // Custom alert & confirm states
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; text: string; type: "success" | "error" | "info"; title: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; text: string; onConfirm: () => void } | null>(null);

  // DB payload mapping helpers
  const mapRecordToDb = (item: any) => {
    return {
      track: item.track,
      year: item.year,
      teacher_name: item.teacherName,
      subject: item.subject,
      semester: item.semester,
      payment_method: item.paymentMethod,
      shash: item.shash,
      meetings: item.meetings,
      total_hours: item.totalHours,
      rate: item.rate,
      employer_overhead: item.employerOverhead,
      total_annual: item.totalAnnual,
      tz: item.tz,
      phone: item.phone,
      email: item.email,
      is_approved: item.isApproved,
      is_contract_ready: item.isContractReady,
      travel: item.travel || "בית שמש",
      grade_timing: item.gradeTiming || "ציון אחד בסוף שנה",
      monthly_hours: item.monthlyHours ? JSON.stringify(item.monthlyHours) : "{}"
    };
  };

  const mapDbToRecord = (dbItem: any): SalaryRecord => {
    return {
      id: dbItem.id,
      track: dbItem.track,
      year: dbItem.year,
      teacherName: dbItem.teacher_name,
      subject: dbItem.subject,
      semester: dbItem.semester,
      paymentMethod: dbItem.payment_method,
      shash: Number(dbItem.shash || 0),
      meetings: Number(dbItem.meetings || 0),
      totalHours: Number(dbItem.total_hours || 0),
      rate: Number(dbItem.rate || 0),
      employerOverhead: Number(dbItem.employer_overhead || 0),
      totalAnnual: Number(dbItem.total_annual || 0),
      tz: dbItem.tz || "",
      phone: dbItem.phone || "",
      email: dbItem.email || "",
      isApproved: Boolean(dbItem.is_approved),
      isContractReady: Boolean(dbItem.is_contract_ready),
      travel: dbItem.travel || "בית שמש",
      gradeTiming: dbItem.grade_timing || "ציון אחד בסוף שנה",
      monthlyHours: dbItem.monthly_hours ? JSON.parse(dbItem.monthly_hours) : {}
    };
  };

  // Load configuration from LocalStorage and backend API on mount
  useEffect(() => {
    // Passwords fast local fallback
    const savedPasswords = localStorage.getItem("sz_passwords_store_v2");
    if (savedPasswords) {
      try {
        setPasswords(JSON.parse(savedPasswords));
      } catch (e) {}
    }

    // Cloud connection state
    const savedUrl = localStorage.getItem("sz_cloud_api_url_v2");
    if (savedUrl) {
      setCustomDbUrl(savedUrl);
    }

    // Initialize Supabase Url and Key from LocalStorage or Environment
    const storedSupUrl = localStorage.getItem("sz_supabase_url");
    const storedSupKey = localStorage.getItem("sz_supabase_key");
    if (storedSupUrl) setSupabaseUrl(storedSupUrl);
    if (storedSupKey) setSupabaseKey(storedSupKey);

    fetchPasswords();
    fetchRecords();
    fetchChangeRequests();
  }, []);

  const fetchPasswords = async () => {
    try {
      const response = await fetch("/api/passwords");
      if (!response.ok) throw new Error("Express backend not available");
      const data = await response.json();
      if (data.success && data.passwords) {
        setPasswords(data.passwords);
        localStorage.setItem("sz_passwords_store_v2", JSON.stringify(data.passwords));
        setCloudConnectionStyle("express");
        setDbMode(data.dbMode || "cloud");
      }
    } catch (err) {
      console.warn("API error fetching passwords, attempting direct Supabase fetch:", err);
      // Fallback to direct client-side Supabase REST
      const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (sUrl && sKey) {
        try {
          const directUrl = `${sUrl}/rest/v1/system_config?key=eq.passwords&select=value`;
          const res = await fetch(directUrl, {
            headers: {
              "apikey": sKey,
              "Authorization": `Bearer ${sKey}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (rows && rows.length > 0) {
              const parsedPasswords = JSON.parse(rows[0].value);
              setPasswords(parsedPasswords);
              localStorage.setItem("sz_passwords_store_v2", JSON.stringify(parsedPasswords));
              setCloudConnectionStyle("direct");
              setDbMode("cloud");
              return;
            }
          }
        } catch (directErr) {
          console.error("Direct Supabase fetch passwords failed:", directErr);
        }
      }
      // If all cloud pathways fail, fallback to localStorage passwords
      const saved = localStorage.getItem("sz_passwords_store_v2");
      if (saved) {
        try { setPasswords(JSON.parse(saved)); } catch (e) {}
      }
    }
  };

  // Fetch from Express Server or Supabase Direct REST
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/records");
      if (!response.ok) throw new Error("Express backend not available");
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
        setDbMode(data.dbMode);
        setCloudConnectionStyle("express");
        return;
      }
      throw new Error("Backend response error status");
    } catch (err) {
      console.warn("API error, checking direct Supabase connection:", err);
      
      const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      if (sUrl && sKey) {
        try {
          const directUrl = `${sUrl}/rest/v1/salary_records?select=*&order=id.asc`;
          const res = await fetch(directUrl, {
            headers: {
              "apikey": sKey,
              "Authorization": `Bearer ${sKey}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows)) {
              const mapped = rows.map(mapDbToRecord);
              setRecords(mapped);
              setDbMode("cloud");
              setCloudConnectionStyle("direct");
              localStorage.setItem("sz_local_records_v2", JSON.stringify(mapped));
              return;
            }
          }
        } catch (directErr) {
          console.error("Direct Supabase fetch records failed:", directErr);
        }
      }

      // Local storage fallback if no internet or no cloud config
      const localData = localStorage.getItem("sz_local_records_v2");
      if (localData) {
        try {
          setRecords(JSON.parse(localData));
        } catch (e) {}
      } else {
        setRecords([]);
      }
      setDbMode("local");
      setCloudConnectionStyle("none");
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    try {
      const response = await fetch("/api/change-requests");
      if (!response.ok) throw new Error("Express backend not available");
      const data = await response.json();
      if (data.success && Array.isArray(data.requests)) {
        setChangeRequests(data.requests);
        localStorage.setItem("sz_change_requests_queue", JSON.stringify(data.requests));
        return;
      }
      throw new Error("Invalid response");
    } catch (err) {
      console.warn("API error fetching change requests, trying localStorage:", err);
      const saved = localStorage.getItem("sz_change_requests_queue");
      if (saved) {
        try {
          setChangeRequests(JSON.parse(saved));
        } catch (e) {}
      }
    }
  };

  const persistChangeRequest = async (request: ChangeRequest) => {
    try {
      const response = await fetch("/api/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const updated = [...changeRequests.filter((r) => r.requestId !== request.requestId), data.request || request];
          setChangeRequests(updated);
          localStorage.setItem("sz_change_requests_queue", JSON.stringify(updated));
          return data.request as ChangeRequest;
        }
      }
    } catch (err) {
      console.warn("Express save change request failed:", err);
    }

    const updated = [...changeRequests.filter((r) => r.requestId !== request.requestId), request];
    localStorage.setItem("sz_change_requests_queue", JSON.stringify(updated));
    setChangeRequests(updated);
    return request;
  };

  const removeChangeRequest = async (requestId: number) => {
    try {
      const response = await fetch(`/api/change-requests/${requestId}`, { method: "DELETE" });
      if (response.ok) {
        const updated = changeRequests.filter((r) => r.requestId !== requestId);
        setChangeRequests(updated);
        localStorage.setItem("sz_change_requests_queue", JSON.stringify(updated));
        return;
      }
    } catch (err) {
      console.warn("Express delete change request failed:", err);
    }

    const updated = changeRequests.filter((r) => r.requestId !== requestId);
    setChangeRequests(updated);
    localStorage.setItem("sz_change_requests_queue", JSON.stringify(updated));
  };

  const openSimulatorModal = (row: SalaryRecord) => {
    setSimulatingRow(row);
    setSimName(row.teacherName);
    setSimSubject(row.subject);
    setSimSemester(formatSemesterDisplay(row.semester));
    setSimPaymentMethod(row.paymentMethod);
    setSimShash(row.shash);
    setSimMeetings(row.meetings);
    setSimRate(row.rate);
    setSimTravel(row.travel || "בית שמש");
    setShowSimulatorModal(true);
  };

  const closeSimulatorModal = () => {
    setShowSimulatorModal(false);
    setSimulatingRow(null);
  };

  const approveChangeRequest = async (requestId: number) => {
    const req = changeRequests.find((r) => r.requestId === requestId);
    if (!req) return;

    const isDeleteRequest = req.requestType === "delete";

    if (isDeleteRequest) {
      // מחיקת המשרה והתקציב שלה לאחר אישור מזכירה/מנהלת
      const rowId = req.rowId;
      setRecords((prev) => prev.filter((r) => r.id !== rowId));
      setLoading(true);
      try {
        const response = await fetch(`/api/records/${rowId}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Delete failed");
      } catch {
        const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        let deleted = false;
        if (sUrl && sKey && rowId > 0) {
          try {
            const res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${rowId}`, {
              method: "DELETE",
              headers: { apikey: sKey, Authorization: `Bearer ${sKey}` },
            });
            deleted = res.ok;
          } catch {}
        }
        if (!deleted) {
          const localData = localStorage.getItem("sz_local_records_v2");
          let localRows: SalaryRecord[] = localData ? JSON.parse(localData) : records;
          localRows = localRows.filter((r) => r.id !== rowId);
          localStorage.setItem("sz_local_records_v2", JSON.stringify(localRows));
        }
      } finally {
        setLoading(false);
      }

      await removeChangeRequest(requestId);
      await fetchRecords();
      await fetchChangeRequests();
      setShowRequestsQueueModal(false);
      return;
    }

    const rowIdx = records.findIndex((r) => r.id === req.rowId);
    if (rowIdx !== -1) {
      const updatedRow: SalaryRecord = {
        ...records[rowIdx],
        teacherName: req.proposed.teacherName,
        subject: req.proposed.subject,
        semester: req.proposed.semester,
        paymentMethod: req.proposed.paymentMethod,
        shash: req.proposed.shash,
        meetings: req.proposed.meetings,
        rate: req.proposed.rate,
        totalHours: req.proposed.totalHours || records[rowIdx].totalHours,
        employerOverhead: req.proposed.employerOverhead || records[rowIdx].employerOverhead,
        totalAnnual: req.proposed.totalAnnual,
        travel: req.proposed.travel || records[rowIdx].travel,
        isContractReady: false,
      };

      // Optimistic UI update so the approved change is visible immediately.
      setRecords((prev) => prev.map((r) => (r.id === updatedRow.id ? updatedRow : r)));

      setLoading(true);
      try {
        const response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedRow),
        });
        if (!response.ok) throw new Error("Save failed");
      } catch {
        // Direct Supabase REST fallback, then local storage.
        const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        let savedToCloud = false;
        if (sUrl && sKey && updatedRow.id > 0) {
          try {
            const res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${updatedRow.id}`, {
              method: "PATCH",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(mapRecordToDb(updatedRow))
            });
            savedToCloud = res.ok;
          } catch {}
        }
        if (!savedToCloud) {
          const localData = localStorage.getItem("sz_local_records_v2");
          let localRows: SalaryRecord[] = localData ? JSON.parse(localData) : records;
          localRows = localRows.map((r) => (r.id === updatedRow.id ? updatedRow : r));
          localStorage.setItem("sz_local_records_v2", JSON.stringify(localRows));
        }
      } finally {
        setLoading(false);
      }
    }

    await removeChangeRequest(requestId);
    await fetchRecords();
    await fetchChangeRequests();
    setShowRequestsQueueModal(false);
  };

  const rejectChangeRequest = (requestId: number) => {
    const req = changeRequests.find((r) => r.requestId === requestId);
    if (!req) return;
    const isDelete = req.requestType === "delete";
    triggerConfirm(
      isDelete
        ? `האם את בטוחה שברצונך לדחות את בקשת המחיקה של משרת המורה "${req.current.teacherName}"?`
        : `האם את בטוחה שברצונך להסיר את בקשת השינוי של משרת המורה "${req.current.teacherName}"?`,
      async () => {
        await removeChangeRequest(requestId);
        await fetchChangeRequests();
        setShowRequestsQueueModal(false);
        triggerAlert(
          isDelete
            ? "בקשת המחיקה הוסרה. המשרה נשארת במערכת."
            : "הבקשה הוסרה מרשימת ההמתנה. מומלץ לשלוח הודעה לרכזת על סיבת הדחייה.",
          "info",
          isDelete ? "בקשת מחיקה נדחתה" : "בקשה הוסרה"
        );
      }
    );
  };

  const toggleExecutionView = () => {
    setIsExecutionViewActive((prev) => !prev);
  };

  const updateMonthlyHourValue = async (teacherId: number, month: string, valueStr: string) => {
    const idx = records.findIndex((item) => item.id === teacherId);
    if (idx === -1) return;

    const cleanedVal = valueStr.trim().replace(/[^\d.]/g, "");
    const hours = parseFloat(cleanedVal) || 0;
    const updatedRow: SalaryRecord = {
      ...records[idx],
      monthlyHours: { ...(records[idx].monthlyHours || {}), [month]: hours },
    };

    setRecords((prev) => prev.map((r) => (r.id === teacherId ? updatedRow : r)));

    try {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRow),
      });
    } catch {
      const localData = localStorage.getItem("sz_local_records_v2");
      let localRows: SalaryRecord[] = localData ? JSON.parse(localData) : records;
      localRows = localRows.map((r) => (r.id === teacherId ? updatedRow : r));
      localStorage.setItem("sz_local_records_v2", JSON.stringify(localRows));
    }
  };

  const coordinatorSentRequests = useMemo(() => {
    if (!activeTrack) return [];
    return changeRequests.filter((req) => req.track === activeTrack);
  }, [changeRequests, activeTrack]);

  // Switch role with password check
  const handleRoleSwitchInitiate = (targetRole: UserRole) => {
    setPendingRoleSwitch(targetRole);
    if (targetRole === "director") {
      setPasswordError("");
      setPasswordInput("");
      setShowPasswordModal(true);
    } else if (targetRole === "secretary") {
      setPasswordError("");
      setPasswordInput("");
      setShowPasswordModal(true);
    } else if (targetRole === "coordinator") {
      setShowCoordSelectModal(true);
    }
  };

  const handleCoordinatorTrackSelect = (track: string) => {
    setPendingTrackSwitch(track);
    setShowCoordSelectModal(false);
    setPasswordError("");
    setPasswordInput("");
    setShowPasswordModal(true);
  };

  const submitPassword = () => {
    if (pendingRoleSwitch === "director") {
      if (passwordInput === passwords.director) {
        setRole("director");
        setActiveTrack(null);
        setShowPasswordModal(false);
        setPendingRoleSwitch(null);
        setFilterTrack("all");
        triggerAlert("ברוכה הבאה, מנהלת הסמינר!", "success", "כניסה מורשית");
      } else {
        setPasswordError("סיסמת מנהלת שגויה!");
      }
    } else if (pendingRoleSwitch === "secretary") {
      if (passwordInput === passwords.secretary) {
        setRole("secretary");
        setActiveTrack(null);
        setShowPasswordModal(false);
        setPendingRoleSwitch(null);
        setFilterTrack("all");
        triggerAlert("ברוכה הבאה, מזכירת הסמינר!", "success", "כניסה מורשית");
      } else {
        setPasswordError("סיסמת מזכירה שגויה!");
      }
    } else if (pendingRoleSwitch === "coordinator" && pendingTrackSwitch) {
      const correctPassword = passwords.coordinators[pendingTrackSwitch] || pendingTrackSwitch;
      if (passwordInput === correctPassword) {
        setRole("coordinator");
        setActiveTrack(pendingTrackSwitch);
        setShowPasswordModal(false);
        setFilterTrack(pendingTrackSwitch);
        setPendingRoleSwitch(null);
        setPendingTrackSwitch(null);
        triggerAlert(`ברוכה הבאה, רכזת מסלול ${pendingTrackSwitch}!`, "success", "כניסה מורשית");
      } else {
        setPasswordError("סיסמת רכזת שגויה!");
      }
    }
  };

  // Helper alerts and confirms.
  // Success/info confirmations ("understood, thank you") are intentionally suppressed so that
  // actions (login, saving, updates) complete silently. Only blocking validation errors are shown.
  const triggerAlert = (text: string, type: "success" | "error" | "info" = "success", title = "הודעת מערכת") => {
    if (type !== "error") return;
    setAlertConfig({ show: true, text, type, title });
  };

  const triggerConfirm = (text: string, onConfirm: () => void) => {
    setConfirmConfig({ show: true, text, onConfirm });
  };

  // Save database URL custom configuration to Express backend and LocalStorage
  const handleSaveDbUrl = async () => {
    // Save to LocalStorage for direct client-side fallback
    localStorage.setItem("sz_cloud_api_url_v2", customDbUrl);
    localStorage.setItem("sz_supabase_url", supabaseUrl);
    localStorage.setItem("sz_supabase_key", supabaseKey);

    // If direct Supabase is configured, set dbMode to cloud immediately as a baseline
    if (supabaseUrl && supabaseKey) {
      setDbMode("cloud");
      setCloudConnectionStyle("direct");
    }

    try {
      const response = await fetch("/api/configure-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: customDbUrl }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDbMode(data.dbMode);
          setCloudConnectionStyle("express");
          triggerAlert("החיבור לענן Supabase עודכן בהצלחה בשרת ובדפדפן!", "success", "עדכון חיבור");
        } else {
          triggerAlert("העדכון בשרת נכשל, אך הנתונים נשמרו מקומית בדפדפן.", "info", "עדכון חיבור");
        }
      } else {
        throw new Error("Express backend returned non-ok status");
      }
    } catch (e) {
      console.warn("Could not save to Express backend, saved to client-side storage instead:", e);
      if (supabaseUrl && supabaseKey) {
        triggerAlert("החיבור הישיר ל-Supabase API נשמר בהצלחה בדפדפן (מצב ענן ישיר)!", "success", "חיבור ישיר פעיל");
      } else if (customDbUrl) {
        triggerAlert("הגדרות החיבור נשמרו בדפדפן, אך לא נמצא שרת Express פעיל לעדכון.", "info", "חיבור שמור");
      } else {
        triggerAlert("ההגדרות נשמרו בדפדפן.", "success");
      }
    } finally {
      setShowDbConfigModal(false);
      fetchRecords();
      fetchPasswords();
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);

    const sUrl = supabaseUrl.trim();
    const sKey = supabaseKey.trim();

    if (!sUrl && !sKey && !customDbUrl) {
      setConnectionTestResult({
        success: false,
        type: "error",
        message: "אנא הזיני כתובת URL ומפתח Supabase או מחרוזת חיבור PostgreSQL לבדיקה."
      });
      setTestingConnection(false);
      return;
    }

    try {
      // 1. Check direct Supabase REST Connection
      if (sUrl && sKey) {
        try {
          const cleanUrl = sUrl.endsWith("/") ? sUrl.slice(0, -1) : sUrl;
          const directUrl = `${cleanUrl}/rest/v1/salary_records?select=id&limit=1`;
          const res = await fetch(directUrl, {
            headers: {
              "apikey": sKey,
              "Authorization": `Bearer ${sKey}`
            }
          });

          if (res.ok) {
            setConnectionTestResult({
              success: true,
              type: "success",
              message: "🎉 החיבור הישיר ל-Supabase הצליח! מסד הנתונים מגיב וטבלת השכר (salary_records) קיימת ופעילה."
            });
          } else if (res.status === 404) {
            setConnectionTestResult({
              success: false,
              type: "warning",
              message: "⚠️ החיבור ל-Supabase הצליח, אך הטבלה 'salary_records' לא נמצאה. אנא ודאי שהרצת את סקריפט ה-SQL ב-Supabase SQL Editor ליצירת הטבלאות (ראי הנחיות ב-AGENTS.md)."
            });
          } else if (res.status === 401 || res.status === 403) {
            setConnectionTestResult({
              success: false,
              type: "error",
              message: "❌ שגיאת הרשאה (401/403). אנא ודאי שמפתח ה-Anon Key או ה-Service Key שהזנת תקין."
            });
          } else {
            const errTxt = await res.text();
            setConnectionTestResult({
              success: false,
              type: "error",
              message: `❌ שגיאה בחיבור ל-Supabase (קוד ${res.status}): ${errTxt}`
            });
          }
          setTestingConnection(false);
          return;
        } catch (directErr: any) {
          console.error("Direct connection test error:", directErr);
          setConnectionTestResult({
            success: false,
            type: "error",
            message: `❌ שגיאת רשת בחיבור הישיר ל-Supabase: ${directErr.message || "לא ניתן לגשת לשרת. ודאי שהכתובת תקינה ואין חסימת CORS."}`
          });
          setTestingConnection(false);
          return;
        }
      }

      // 2. Fallback to testing backend Express connection if customDbUrl is filled
      if (customDbUrl) {
        try {
          const response = await fetch("/api/configure-db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ databaseUrl: customDbUrl }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.dbMode === "cloud") {
              setConnectionTestResult({
                success: true,
                type: "success",
                message: "🎉 חיבור השרת ל-PostgreSQL/Supabase דרך Express עודכן ופעיל בהצלחה!"
              });
            } else {
              setConnectionTestResult({
                success: false,
                type: "warning",
                message: "⚠️ שרת ה-Express השיב בהצלחה, אך המערכת עובדת במצב מקומי. ודאי שמחרוזת ה-DATABASE_URL תקינה ופעילה."
              });
            }
          } else {
            setConnectionTestResult({
              success: false,
              type: "error",
              message: "❌ שרת ה-Express האחורי לא הצליח לעדכן את החיבור (שגיאת שרת)."
            });
          }
        } catch (serverErr: any) {
          setConnectionTestResult({
            success: false,
            type: "error",
            message: `❌ שגיאת תקשורת מול שרת ה-Express האחורי: ${serverErr.message || "השרת אינו זמין."}`
          });
        }
      }

    } catch (globalErr: any) {
      setConnectionTestResult({
        success: false,
        type: "error",
        message: `❌ שגיאה בלתי צפויה: ${globalErr.message || globalErr}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleClearDbUrl = async () => {
    setCustomDbUrl("");
    setSupabaseUrl("");
    setSupabaseKey("");
    localStorage.removeItem("sz_cloud_api_url_v2");
    localStorage.removeItem("sz_supabase_url");
    localStorage.removeItem("sz_supabase_key");
    setCloudConnectionStyle("none");

    try {
      await fetch("/api/configure-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: "" }),
      });
      setDbMode("local");
      triggerAlert("חיבור הענן בוטל. האפליקציה פועלת כעת במצב מקומי.", "info", "ניתוק חיבור");
    } catch (e) {
      console.warn("Express backend disconnect failed, cleared local client-side configuration:", e);
      setDbMode("local");
      triggerAlert("חיבור הענן בוטל בדפדפן. האפליקציה פועלת כעת במצב מקומי.", "info", "ניתוק חיבור");
    } finally {
      setShowDbConfigModal(false);
      fetchRecords();
    }
  };

  // Row mathematical calculations engine
  const computeCalculations = (shash: number, meetings: number, rate: number, paymentMethod: string) => {
    let totalHours = 0;
    if (paymentMethod === "תקן") {
      totalHours = Math.round(shash * 30);
    } else {
      totalHours = Math.round(shash * meetings);
    }

    let overheadFactor = 1.0;
    if (paymentMethod === "תקן") {
      overheadFactor = 1.45;
    } else if (paymentMethod === "שכר מרצים") {
      overheadFactor = 1.30;
    } else if (paymentMethod === "קבלה") {
      overheadFactor = 1.18;
    } else if (paymentMethod === "קבלת פטור") {
      overheadFactor = 1.00;
    }

    const employerOverhead = Math.round(rate * overheadFactor);
    const totalAnnual = Math.round(totalHours * employerOverhead);

    return { totalHours, employerOverhead, totalAnnual };
  };

  const simCalculations = useMemo(() => {
    return computeCalculations(simShash, simMeetings, simRate, simPaymentMethod);
  }, [simShash, simMeetings, simRate, simPaymentMethod]);

  const simBudgetStatus = useMemo(() => {
    if (!simulatingRow) return null;
    const track = simulatingRow.track;
    const limit = TRACKS_BUDGET_LIMITS[track] || 150000;
    let otherTotal = 0;
    records.forEach((row) => {
      if (row.track === track && row.id !== simulatingRow.id) {
        otherTotal += row.totalAnnual || 0;
      }
    });
    const newTotal = otherTotal + simCalculations.totalAnnual;
    const difference = simCalculations.totalAnnual - simulatingRow.totalAnnual;
    const remaining = limit - newTotal;
    return { limit, difference, remaining, track };
  }, [simulatingRow, simCalculations, records]);

  const submitChangeRequest = async () => {
    if (!simulatingRow) return;
    if (!simName.trim() || !simSubject.trim()) {
      triggerAlert("חובה למלא את שם המורה והמקצוע לפני הגשת הבקשה!", "error");
      return;
    }

    const request: ChangeRequest = {
      requestId: Date.now(),
      rowId: simulatingRow.id,
      track: simulatingRow.track,
      requestType: "change",
      current: {
        teacherName: simulatingRow.teacherName,
        subject: simulatingRow.subject,
        semester: simulatingRow.semester,
        paymentMethod: simulatingRow.paymentMethod,
        shash: simulatingRow.shash,
        meetings: simulatingRow.meetings,
        rate: simulatingRow.rate,
        totalAnnual: simulatingRow.totalAnnual,
        travel: simulatingRow.travel,
      },
      proposed: {
        teacherName: simName.trim(),
        subject: simSubject.trim(),
        semester: simSemester,
        paymentMethod: simPaymentMethod,
        shash: simShash,
        meetings: simMeetings,
        rate: simRate,
        totalHours: simCalculations.totalHours,
        employerOverhead: simCalculations.employerOverhead,
        totalAnnual: simCalculations.totalAnnual,
        travel: simTravel,
      },
      timestamp: new Date().toLocaleString("he-IL"),
    };

    await persistChangeRequest(request);
    await fetchChangeRequests();
    triggerAlert("בקשת השינוי והעדכון נשלחה בהצלחה אל המזכירה האחראית לבחינה ואישור! 📤", "success");
    closeSimulatorModal();
  };

  const submitDeleteJobRequest = (row: SalaryRecord) => {
    if (row.id <= 0) {
      triggerAlert("לא ניתן לשלוח בקשת מחיקה לשורה שעדיין לא נשמרה.", "error");
      return;
    }

    const alreadyPending = changeRequests.some(
      (r) => r.rowId === row.id && r.requestType === "delete"
    );
    if (alreadyPending) {
      triggerAlert("כבר קיימת בקשת מחיקה ממתינה למשרה זו.", "info");
      return;
    }

    triggerConfirm(
      `האם לשלוח בקשת מחיקה למשרת "${row.teacherName || "—"}" (${row.subject || "—"})?\nהמשרה והתקציב יימחקו רק לאחר אישור מזכירה או מנהלת.`,
      async () => {
        const snapshot = {
          teacherName: row.teacherName,
          subject: row.subject,
          semester: row.semester,
          paymentMethod: row.paymentMethod,
          shash: row.shash,
          meetings: row.meetings,
          rate: row.rate,
          totalHours: row.totalHours,
          employerOverhead: row.employerOverhead,
          totalAnnual: row.totalAnnual,
          travel: row.travel,
        };
        const request: ChangeRequest = {
          requestId: Date.now(),
          rowId: row.id,
          track: row.track,
          requestType: "delete",
          current: snapshot,
          proposed: snapshot,
          timestamp: new Date().toLocaleString("he-IL"),
        };
        await persistChangeRequest(request);
        await fetchChangeRequests();
        triggerAlert("בקשת מחיקת המשרה נשלחה לאישור מזכירה / מנהלת.", "success");
      }
    );
  };

  // Add empty row
  const handleAddNewRow = () => {
    if (records.some((r) => r.id < 0)) {
      triggerAlert("ישנה שורה חדשה שנמצאת כעת בעריכה. אנא שמרי או בטלי אותה תחילה!", "info", "שורה בעריכה");
      return;
    }

    const tempId = -Math.floor(Math.random() * 100000) - 1;
    const initialTrack = role === "coordinator" && activeTrack ? activeTrack : "קודש";

    const newRow: SalaryRecord = {
      id: tempId,
      track: initialTrack,
      year: "יג",
      teacherName: "",
      subject: "",
      semester: "שנתי",
      paymentMethod: "שכר מרצים",
      shash: 0,
      meetings: 0,
      totalHours: 0,
      rate: 0,
      employerOverhead: 0,
      totalAnnual: 0,
      tz: "",
      phone: "",
      email: "",
      isApproved: false,
      isContractReady: false,
      travel: "בית שמש",
      gradeTiming: "ציון אחד בסוף שנה",
      monthlyHours: {}
    };

    setRecords([newRow, ...records]);
    loadEditBuffers(newRow);
    // Inline editing directly in the table (no pop-up) for the new draft row.
    setActiveEditingId(tempId);
    setEditModalId(null);
  };

  // Loads a row's values into the shared edit buffers (used by both inline add and modal edit).
  const loadEditBuffers = (row: SalaryRecord) => {
    setEditTrack(row.track);
    setEditYear(row.year);
    setEditTeacherName(row.teacherName);
    setEditSubject(row.subject);
    setEditSemester(formatSemesterDisplay(row.semester));
    setEditPaymentMethod(row.paymentMethod);
    setEditShash(row.shash);
    setEditMeetings(row.meetings);
    setEditRate(row.rate);
    setEditTz(row.tz);
    setEditPhone(row.phone);
    setEditEmail(row.email);
    setEditTravel(row.travel || "בית שמש");
    setEditGradeTiming(
      row.gradeTiming?.includes("ללא ציון")
        ? "ללא ציון"
        : row.gradeTiming?.replace(/סמסטר/g, "מחצית").replace(" (סדנה/ערב)", "") || "ציון אחד בסוף שנה"
    );
  };

  // Editing an EXISTING row opens the pop-up modal.
  const handleEditRowStart = (row: SalaryRecord) => {
    loadEditBuffers(row);
    setActiveEditingId(null);
    setEditModalId(row.id);
  };

  const handleCancelEdit = (id: number) => {
    if (id < 0) {
      // Remove newly created row draft
      setRecords(records.filter((r) => r.id !== id));
    }
    setActiveEditingId(null);
    setEditModalId(null);
  };

  // Save changes to Postgres DB
  const handleSaveRow = async (id: number) => {
    if (!editTeacherName.trim() || !editSubject.trim()) {
      triggerAlert("חובה להזין את שם המורה ושם המקצוע על מנת לשמור!", "error", "פרטים חסרים");
      return;
    }

    if (!editPhone.trim() || !editEmail.trim()) {
      triggerAlert("שימו לב: לא ניתן לשמור שורה ללא מספר טלפון וכתובת אימייל מזהה של המורה!", "error", "פרטי קשר חסרים");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(editEmail)) {
      triggerAlert("כתובת האימייל שהוזנה אינה תקינה! ודאי שהיא במבנה: name@domain.com", "error", "אימייל לא תקין");
      return;
    }

    const calcs = computeCalculations(editShash, editMeetings, editRate, editPaymentMethod);

    const matchRow = records.find((r) => r.id === id);
    const updatedRow: SalaryRecord = {
      id: id > 0 ? id : 0, // id is mapped server-side for new entries
      track: editTrack,
      year: editYear,
      teacherName: editTeacherName.trim(),
      subject: editSubject.trim(),
      semester: editSemester,
      paymentMethod: editPaymentMethod,
      shash: editShash,
      meetings: editMeetings,
      totalHours: calcs.totalHours,
      rate: editRate,
      employerOverhead: calcs.employerOverhead,
      totalAnnual: calcs.totalAnnual,
      tz: editTz.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      isApproved: matchRow ? matchRow.isApproved : false,
      isContractReady: matchRow ? matchRow.isContractReady : false,
      travel: editTravel,
      gradeTiming: editGradeTiming,
      monthlyHours: matchRow ? matchRow.monthlyHours : {}
    };

    setLoading(true);
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRow),
      });
      if (!response.ok) throw new Error("Express backend not available or returned error");
      const data = await response.json();
      if (data.success) {
        triggerAlert(`משרת המורה "${updatedRow.teacherName}" נשמרה בהצלחה במערכת!`, "success", "נשמר בהצלחה");
        setActiveEditingId(null);
        setEditModalId(null);
        fetchRecords();
        return;
      }
      throw new Error("Express backend returned unsuccessful response");
    } catch (err) {
      console.warn("Express backend save failed, attempting direct Supabase save:", err);
      
      const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      if (sUrl && sKey) {
        try {
          const dbPayload = mapRecordToDb(updatedRow);
          let res;
          if (id > 0) {
            // PATCH existing record
            res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${id}`, {
              method: "PATCH",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
              },
              body: JSON.stringify(dbPayload)
            });
          } else {
            // POST new record
            res = await fetch(`${sUrl}/rest/v1/salary_records`, {
              method: "POST",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
              },
              body: JSON.stringify(dbPayload)
            });
          }

          if (res.ok) {
            const rows = await res.json();
            const savedItem = rows && rows.length > 0 ? mapDbToRecord(rows[0]) : updatedRow;
            triggerAlert(`משרת המורה "${savedItem.teacherName}" נשמרה בהצלחה ישירות בענן!`, "success", "נשמר בהצלחה");
            setActiveEditingId(null);
            setEditModalId(null);
            fetchRecords();
            return;
          } else {
            const errText = await res.text();
            throw new Error(`Supabase REST error: ${res.status} - ${errText}`);
          }
        } catch (directErr) {
          console.error("Direct Supabase save failed:", directErr);
        }
      }

      // Local storage fallback as last resort
      try {
        const localData = localStorage.getItem("sz_local_records_v2");
        let localRows: any[] = [];
        if (localData) {
          localRows = JSON.parse(localData);
        }

        if (id > 0) {
          localRows = localRows.map((r: any) => r.id === id ? updatedRow : r);
        } else {
          const nextId = localRows.length > 0 ? Math.max(...localRows.map((r: any) => r.id || 0)) + 1 : 1;
          localRows.push({ ...updatedRow, id: nextId });
        }

        localStorage.setItem("sz_local_records_v2", JSON.stringify(localRows));
        triggerAlert(`משרת המורה "${updatedRow.teacherName}" נשמרה בהצלחה במחשב זה (מצב מקומי)!`, "success", "נשמר מקומית");
        setActiveEditingId(null);
        setEditModalId(null);
        fetchRecords();
      } catch (localErr) {
        triggerAlert("שגיאה בשמירת הנתונים מקומית", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRow = (id: number, teacherName: string) => {
    triggerConfirm(`האם את בטוחה שברצונך למחוק לחלוטין את משרת המורה "${teacherName || '—'}" מהמערכת?`, async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/records/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Express backend not available");
        const data = await response.json();
        if (data.success) {
          triggerAlert("השורה נמחקה בהצלחה מהמערכת.", "success");
          fetchRecords();
          return;
        }
        throw new Error("Backend delete failed status");
      } catch (err) {
        console.warn("Express backend delete failed, trying direct Supabase delete:", err);

        const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        if (sUrl && sKey) {
          try {
            const res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${id}`, {
              method: "DELETE",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`
              }
            });
            if (res.ok) {
              triggerAlert("השורה נמחקה בהצלחה מהענן!", "success");
              fetchRecords();
              return;
            }
          } catch (directErr) {
            console.error("Direct Supabase delete failed:", directErr);
          }
        }

        // Local storage delete
        try {
          const localData = localStorage.getItem("sz_local_records_v2");
          if (localData) {
            const localRows = JSON.parse(localData);
            const filtered = localRows.filter((r: any) => r.id !== id);
            localStorage.setItem("sz_local_records_v2", JSON.stringify(filtered));
            triggerAlert("השורה נמחקה בהצלחה ממחשב זה (מצב מקומי).", "success");
          }
        } catch (e) {}
        fetchRecords();
      } finally {
        setLoading(false);
      }
    });
  };

  const handleToggleApproved = async (id: number, approvedStatus: boolean) => {
    const row = records.find((r) => r.id === id);
    if (!row) return;

    const updatedRow = {
      ...row,
      isApproved: approvedStatus,
      isContractReady: approvedStatus ? row.isContractReady : false
    };

    setLoading(true);
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRow),
      });
      if (!response.ok) throw new Error("Express backend not available");
      const data = await response.json();
      if (data.success) {
        triggerAlert(
          `משרת המורה "${row.teacherName}" ${approvedStatus ? "אושרה לתשלום בהצלחה!" : "הועברה חזרה למצב ממתין לאישור."}`,
          "success"
        );
        fetchRecords();
        return;
      }
      throw new Error("Backend approval toggle returned unsuccessful response");
    } catch (e) {
      console.warn("Express backend toggle approval failed, trying direct Supabase:", e);

      const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      if (sUrl && sKey) {
        try {
          const dbPayload = mapRecordToDb(updatedRow);
          const res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${id}`, {
            method: "PATCH",
            headers: {
              "apikey": sKey,
              "Authorization": `Bearer ${sKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(dbPayload)
          });
          if (res.ok) {
            triggerAlert(
              `משרת המורה "${row.teacherName}" ${approvedStatus ? "אושרה לתשלום בענן!" : "הועברה חזרה למצב ממתין לאישור בענן."}`,
              "success"
            );
            fetchRecords();
            return;
          }
        } catch (directErr) {
          console.error("Direct Supabase toggle approval failed:", directErr);
        }
      }

      // Local storage toggle approval fallback
      try {
        const localData = localStorage.getItem("sz_local_records_v2");
        if (localData) {
          const localRows = JSON.parse(localData);
          const updated = localRows.map((r: any) => r.id === id ? updatedRow : r);
          localStorage.setItem("sz_local_records_v2", JSON.stringify(updated));
          triggerAlert(
            `משרת המורה "${row.teacherName}" ${approvedStatus ? "אושרה לתשלום מקומית!" : "הועברה חזרה למצב ממתין לאישור מקומית."}`,
            "success"
          );
        }
      } catch (errLocal) {}
      fetchRecords();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoordinatorPasswords = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords)
      });
      if (!response.ok) throw new Error("Express backend not available");
      const data = await response.json();
      if (data.success && data.passwords) {
        setPasswords(data.passwords);
        localStorage.setItem("sz_passwords_store_v2", JSON.stringify(data.passwords));
        triggerAlert("הסיסמאות עודכנו ונשמרו בהצלחה במסד הנתונים ובמערכת!", "success");
        return;
      }
      throw new Error("Backend passwords save failed status");
    } catch (e) {
      console.warn("Express backend save passwords failed, trying direct Supabase save:", e);

      const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      if (sUrl && sKey) {
        try {
          // Check if key exists
          const checkRes = await fetch(`${sUrl}/rest/v1/system_config?key=eq.passwords`, {
            headers: {
              "apikey": sKey,
              "Authorization": `Bearer ${sKey}`
            }
          });
          const rows = await checkRes.json();
          let saveRes;
          if (rows && rows.length > 0) {
            // PATCH existing key
            saveRes = await fetch(`${sUrl}/rest/v1/system_config?key=eq.passwords`, {
              method: "PATCH",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ value: JSON.stringify(passwords) })
            });
          } else {
            // POST new key
            saveRes = await fetch(`${sUrl}/rest/v1/system_config`, {
              method: "POST",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ key: "passwords", value: JSON.stringify(passwords) })
            });
          }

          if (saveRes.ok) {
            localStorage.setItem("sz_passwords_store_v2", JSON.stringify(passwords));
            triggerAlert("הסיסמאות עודכנו ונשמרו בהצלחה בענן!", "success");
            return;
          }
        } catch (directErr) {
          console.error("Direct Supabase passwords save failed:", directErr);
        }
      }

      localStorage.setItem("sz_passwords_store_v2", JSON.stringify(passwords));
      triggerAlert("הסיסמאות עודכנו מקומית!", "info");
    } finally {
      setLoading(false);
      setShowPasswordsHelperModal(false);
    }
  };

  // End-of-year permanent wipe of ALL system data (Director only).
  // Guarded by the typed-confirmation modal; performs deletion across Express / Supabase / local.
  const handleConfirmWipe = async () => {
    if (wipeConfirmText.trim() !== WIPE_CONFIRM_PHRASE) return;
    setLoading(true);

    const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    try {
      for (const r of records) {
        if (r.id <= 0) continue;
        let deleted = false;
        try {
          const response = await fetch(`/api/records/${r.id}`, { method: "DELETE" });
          deleted = response.ok;
        } catch {}
        if (!deleted && sUrl && sKey) {
          try {
            const res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${r.id}`, {
              method: "DELETE",
              headers: { "apikey": sKey, "Authorization": `Bearer ${sKey}` }
            });
            deleted = res.ok;
          } catch {}
        }
      }
      // Clear local mirror as well.
      localStorage.removeItem("sz_local_records_v2");
      setRecords([]);
    } finally {
      setLoading(false);
      setShowWipeModal(false);
      setWipeConfirmText("");
      fetchRecords();
    }
  };

  // Filter application
  const filteredRecords = useMemo(() => {
    const selectedTrack = normalizeTrack(filterTrack);
    return records.filter((item) => {
      // If coordinator, enforce their track filter
      if (role === "coordinator" && activeTrack && normalizeTrack(item.track) !== normalizeTrack(activeTrack)) {
        return false;
      }

      if (filterTrack !== "all" && normalizeTrack(item.track) !== selectedTrack) return false;
      if (filterJobType !== "all" && item.paymentMethod !== filterJobType) return false;
      if (filterYear !== "all" && item.year !== filterYear) return false;

      if (filterStatus === "approved" && !item.isApproved) return false;
      if (filterStatus === "pending" && item.isApproved) return false;
      if (filterStatus === "saved" && item.id < 0) return false;
      if (filterStatus === "contract_prepared" && !item.isContractReady) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (item.teacherName || "").toLowerCase().includes(query);
        const matchSubject = (item.subject || "").toLowerCase().includes(query);
        const matchTz = (item.tz || "").includes(query);
        if (!matchName && !matchSubject && !matchTz) return false;
      }

      return true;
    });
  }, [records, role, activeTrack, filterTrack, filterJobType, filterYear, filterStatus, searchQuery]);

  /** כל המסלולים לסינון — כולל מסלולים קיימים בנתונים גם אם אינם ברשימה הקבועה */
  const trackFilterOptions = useMemo(() => {
    const fromData = records.map((r) => r.track).filter(Boolean);
    const merged = Array.from(new Set([...ALL_TRACKS, ...fromData]));
    return merged.sort((a, b) => a.localeCompare(b, "he"));
  }, [records]);

  // General Totals Metric
  const metrics = useMemo(() => {
    let totalBudget = 0;
    let approvedBudget = 0;
    let totalHours = 0;
    let countTenure = 0;
    let countLecturer = 0;
    let countReceipt = 0;
    let countExempt = 0;

    // Use total records or filtered? The dashboard original used cumulative dataset, but let's aggregate for all records in the system or filtered based on role
    const sourceRecords = role === "coordinator" ? records.filter(r => r.track === activeTrack) : records;

    sourceRecords.forEach((item) => {
      totalBudget += item.totalAnnual;
      totalHours += item.totalHours;
      if (item.isApproved) {
        approvedBudget += item.totalAnnual;
      }

      if (item.paymentMethod === "תקן") countTenure++;
      else if (item.paymentMethod === "שכר מרצים") countLecturer++;
      else if (item.paymentMethod === "קבלה") countReceipt++;
      else if (item.paymentMethod === "קבלת פטור") countExempt++;
    });

    const approvedPct = totalBudget > 0 ? Math.round((approvedBudget / totalBudget) * 100) : 0;

    return {
      totalBudget,
      approvedBudget,
      approvedPct,
      totalHours,
      countTenure,
      countLecturer,
      countReceipt,
      countExempt,
      totalSaved: records.filter((r) => r.id > 0).length
    };
  }, [records, role, activeTrack]);

  // Track budget statistics for visualization
  const trackBudgets = useMemo(() => {
    const budgets: Record<string, number> = {};
    ALL_TRACKS.forEach((t) => {
      budgets[t] = 0;
    });

    let grandTotal = 0;
    records.forEach((item) => {
      if (budgets[item.track] !== undefined) {
        budgets[item.track] += item.totalAnnual;
        grandTotal += item.totalAnnual;
      }
    });

    return { budgets, grandTotal };
  }, [records]);

  // Consolidated Contract text generator
  const generatedContractText = useMemo(() => {
    if (!activeContractRecord) return "";

    const prefix =
      activeContractRecord.teacherName.includes("הרב") ||
      activeContractRecord.teacherName.startsWith("רבי")
        ? "הרב"
        : "הגב'";
    const pronounTeacher = prefix === "הרב" ? "העובד" : "העובדת";
    const prefixSheHe = prefix === "הרב" ? "המורה יאפשר" : "המורה תאפשר";
    const suffixHeShe = prefix === "הרב" ? "אינו מועסק" : "אינה מועסקת";
    const suffixWorkHeShe = prefix === "הרב" ? "עבודתו" : "עבודתה";
    const suffixTeachHeShe = prefix === "הרב" ? "ילמד המורה" : "תלמד המורה";
    const pronounSuffix = prefix === "הרב" ? "משרתו" : "משרתה";
    const suffixSigned = prefix === "הרב" ? "העובד" : "העובדת";

    const nameLower = activeContractRecord.teacherName.trim().toLowerCase();
    const teacherRows = records.filter(
      (r) => r.teacherName && r.teacherName.trim().toLowerCase() === nameLower
    );

    let rowsDetails = "";
    let hasTenure = false;
    let hasLecturer = false;

    teacherRows.forEach((row) => {
      const formattedSemester = formatSemesterDisplay(row.semester).includes("מחצית א'")
        ? "מחצית א'"
        : formatSemesterDisplay(row.semester).includes("מחצית ב'")
        ? "מחצית ב'"
        : "שנתי";
      let rowDetail = "";
      if (row.paymentMethod === "תקן") {
        rowDetail = `(${row.track}) ${row.shash} ש"ש ${row.subject}, כיתה ${row.year} – ${formattedSemester} בתעריף תקן`;
        hasTenure = true;
      } else {
        let pType = "בשכר מרצים";
        if (row.paymentMethod === "קבלה") {
          pType = "בקבלה";
        } else if (row.paymentMethod === "קבלת פטור") {
          pType = "בפטור";
        } else {
          hasLecturer = true;
        }
        rowDetail = `(${row.track}) ${row.totalHours} ש' ${row.subject}, כיתה ${row.year} – ${formattedSemester} ${pType} בתעריף ${row.rate} ₪ ברוטו לשעה`;
      }
      rowsDetails += `* ${rowDetail}\n`;
    });

    let commitmentLine = "";
    let teachingRequirement = "";

    if (hasTenure && hasLecturer) {
      commitmentLine = `אגודת בית יעקב מתחייבת לשלם את שעות עבודתך כשעות תקן וכשעות שכר מרצים במהלך שנה"ל תשפ"ז. התחייבות זו הינה בתוקף לשנה"ל תשפ"ז בלבד.`;
      teachingRequirement = `על המורה ללמד 30 שיעורים בשנה עבור כל ש"ש בתקן, וכן לעמוד במכסת שיעורי שכר המרצים כפי שסוכם. במקרה ולא בוצעה מכסת השיעורים עפ"י החישוב הנ"ל, ${suffixTeachHeShe} את יתרת השיעורים בקורסי קיץ / תגבור מעבר למערכת הלימודים.`;
    } else if (hasTenure) {
      commitmentLine = `אגודת בית יעקב מתחייבת לשלם את שעות עבודתך כשעות תקן במהלך שנה"ל תשפ"ז. התחייבות זו הינה בתוקף לשנה"ל תשפ"ז בלבד.`;
      teachingRequirement = `על המורה ללמד 30 שיעורים בשנה עבור כל ש"ש בתקן. במקרה ולא בוצעה מכסת השיעורים עפ"י החישוב הנ"ל, ${suffixTeachHeShe} את יתרת השיעורים בקורסי קיץ / תגבור מעבר למערכת הלימודים.`;
    } else if (hasLecturer) {
      commitmentLine = `אגודת בית יעקב מתחייבת לשלם את שעות עבודתך כשעות שכר מרצים במהלך שנה"ל תשפ"ז. התחייבות זו הינה בתוקף לשנה"ל תשפ"ז בלבד.`;
      teachingRequirement = `על המורה ללמד את מכסת השיעורים עפ"י החישוב הנ"ל. במקרה ולא בוצעה המכסה, ${suffixTeachHeShe} את יתרת השיעורים בקורסי קיץ / תגבור מעבר למערכת הלימודים.`;
    } else {
      commitmentLine = `אגודת בית יעקב מתחייבת לשלם את שעות עבודתך כשעות עבודה חיצוניות / קבלה במהלך שנה"ל תשפ"ז. התחייבות זו הינה בתוקף לשנה"ל תשפ"ז בלבד.`;
      teachingRequirement = `על המורה ללמד את מכסת השיעורים עפ"י החישוב הנ"ל. במקרה ולא בוצעה המכסה, ${suffixTeachHeShe} את יתרת השיעורים בקורסי קיץ / תגבור מעבר למערכת הלימודים.`;
    }

    return `הסכם העסקה אישי
שנערך ונחתם בתל אביב _______ ביום _________ בחודש ____ שנת ______

בין:
אגודת בית יעקב (ע"ר)
מספר עמותה: 580052306, מרחוב ר' יצחק אלחנן 4, תל אביב
(להלן: "העמותה")
— מצד אחד —

לבין:
${prefix} ${activeContractRecord.teacherName}
נושא/ת ת.ז. ${activeContractRecord.tz || "_________"}
(להלן: "${pronounTeacher}")
— מצד שני —

העבודה מתבצעת מול הסמינר בעיר בית שמש, התשלום הוא ע"י אגודת "בית יעקב".

סוכם לשנה"ל תשפ"ז:
${rowsDetails}
---

${commitmentLine}
${prefixSheHe} למוסד לרשום את כל אחוזי ${pronounSuffix} במצבת המורים למשרד החינוך ו${suffixHeShe} מעל 140% משרה בכל מקומות ${suffixWorkHeShe}.
${teachingRequirement}

____________________                    _____________________                   ______________________
     האגודה                                    המנהלת                                  ${suffixSigned}`;
  }, [activeContractRecord, records]);

  // Handle marking contract as ready for all teacher's rows
  const handleToggleContractStatus = async () => {
    if (!activeContractRecord) return;
    const nameLower = activeContractRecord.teacherName.trim().toLowerCase();
    const newStatus = !activeContractRecord.isContractReady;

    const teacherRows = records.filter(
      (r) => r.teacherName && r.teacherName.trim().toLowerCase() === nameLower
    );
    const updatedRows = teacherRows.map((row) => ({ ...row, isContractReady: newStatus }));
    const updatedIds = new Set(updatedRows.map((r) => r.id));

    // Optimistic UI update so the row colors immediately
    setRecords((prev) =>
      prev.map((r) => (updatedIds.has(r.id) ? { ...r, isContractReady: newStatus } : r))
    );
    setActiveContractRecord((prev) => (prev ? { ...prev, isContractReady: newStatus } : prev));

    setLoading(true);
    try {
      const sUrl = localStorage.getItem("sz_supabase_url") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const sKey = localStorage.getItem("sz_supabase_key") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      for (const updated of updatedRows) {
        let saved = false;

        try {
          const response = await fetch("/api/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          if (response.ok) {
            const data = await response.json();
            saved = Boolean(data.success);
          }
        } catch {}

        if (!saved && sUrl && sKey && updated.id > 0) {
          try {
            const res = await fetch(`${sUrl}/rest/v1/salary_records?id=eq.${updated.id}`, {
              method: "PATCH",
              headers: {
                "apikey": sKey,
                "Authorization": `Bearer ${sKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(mapRecordToDb(updated)),
            });
            saved = res.ok;
          } catch {}
        }

        if (!saved) {
          const localData = localStorage.getItem("sz_local_records_v2");
          let localRows: SalaryRecord[] = localData ? JSON.parse(localData) : records;
          localRows = localRows.map((r) => (r.id === updated.id ? updated : r));
          localStorage.setItem("sz_local_records_v2", JSON.stringify(localRows));
        }
      }

      setShowContractModal(false);
      await fetchRecords();
    } catch {
      triggerAlert("תקלה בעדכון סטטוס חוזה", "error");
      await fetchRecords();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContract = () => {
    const textEl = document.createElement("textarea");
    textEl.value = generatedContractText;
    document.body.appendChild(textEl);
    textEl.select();
    document.execCommand("copy");
    document.body.removeChild(textEl);
    triggerAlert("החוזה המאוחד הועתק בהצלחה לקליפבורד!", "success", "העתק בוצע");
  };

  const handleDownloadContract = () => {
    if (!activeContractRecord) return;
    const blob = new Blob([generatedContractText], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `חוזה_העסקה_${activeContractRecord.teacherName.replace(/\s+/g, "_")}_תשפז.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("הקובץ הורד למחשבכן בהצלחה!", "success");
  };

  // CSV Exports
  const handleExportAlfon = () => {
    let csv = "\uFEFFשם המורה,מספר טלפון,כתובת אימייל,התמחות/מסלול\n";
    const seen = new Set<string>();
    const uniqueTeachers: SalaryRecord[] = [];

    records.forEach((item) => {
      const name = (item.teacherName || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        uniqueTeachers.push(item);
      }
    });

    if (uniqueTeachers.length === 0) {
      triggerAlert("אין מורות מדווחות במערכת לייצוא כרגע.", "info");
      return;
    }

    uniqueTeachers.forEach((item) => {
      csv += `"${item.teacherName || ""}","${item.phone || ""}","${item.email || ""}","${item.track || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "אלפון_מורות_סמינר_שצרנסקי_תשפז.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("קובץ אלפון מורות מרוכז יוצא והורד בהצלחה!", "success");
  };

  const handleExportToExcel = () => {
    if (filteredRecords.length === 0) {
      triggerAlert("אין נתונים בטבלה לייצוא אקסל!", "info");
      return;
    }

    let csv = "\uFEFFהתמחות,שנה,שם המורה,שם המקצוע,מחצית / מחזור,צורת תשלום,ש\"ש,מפגשים/חודשים,שעות תלמידות שנתי,תעריף שעה,עלות מעביד,סה\"כ שנתי שכר,סטטוס אישור,נסיעות\n";
    let totalHoursSum = 0;
    let totalBudgetSum = 0;

    filteredRecords.forEach((item) => {
      const statusStr = item.isApproved ? "מאושר לתשלום" : "ממתין לאישור";
      const travelStr = item.travel || "בית שמש";
      const methodStr = `${item.paymentMethod} (${item.paymentMethod === "תקן" ? "+45%" : item.paymentMethod === "שכר מרצים" ? "+30%" : item.paymentMethod === "קבלה" ? "+18%" : "0%"})`;

      csv += `"${item.track || ""}","${item.year || ""}","${item.teacherName || ""}","${item.subject || ""}","${formatSemesterDisplay(item.semester)}","${methodStr}",${item.shash},${item.meetings},${item.totalHours},${item.rate},${item.employerOverhead},${item.totalAnnual},"${statusStr}","${travelStr}"\n`;

      totalHoursSum += item.totalHours;
      totalBudgetSum += item.totalAnnual;
    });

    csv += `"סה""כ מוצג:","","","","","",0,0,${totalHoursSum},0,0,${totalBudgetSum},"",""\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "ריכוז_תקציב_שכר_סמינר_שצרנסקי_תשפז.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("הדוח יוצא לאקסל בהצלחה (בפורמט CSV נתמך)!", "success");
  };

  const handleExportExecutionToExcel = () => {
    const executionRows = records.filter((r) => isExecutionEligible(r.paymentMethod));
    if (executionRows.length === 0) {
      triggerAlert("אין מורות לדיווח ביצוע (שכר מרצים / קבלה) לייצוא!", "info");
      return;
    }

    let csv = `\uFEFFשם המורה,שם המקצוע,התמחות,צורת תשלום,שעות שהוקצו,תעריף,${MONTH_LABELS.join(",")},שעות שבוצעו,יתרת שעות\n`;

    executionRows.forEach((item) => {
      const monthly = item.monthlyHours || {};
      const monthValues = MONTH_KEYS.map((m) => parseFloat(String(monthly[m] || 0)) || 0);
      const totalDone = monthValues.reduce((sum, val) => sum + val, 0);
      const allocated = item.totalHours || 0;
      const remaining = allocated - totalDone;

      csv += `"${item.teacherName || ""}","${item.subject || ""}","${item.track || ""}","${item.paymentMethod || ""}",${allocated},${item.rate},${monthValues.join(",")},${totalDone},${remaining}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "דיווח_ביצוע_חודשי_תשפז.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("דוח הביצוע החודשי יוצא לאקסל בהצלחה!", "success");
  };

  // Live calculation updater for active editing row
  const activeCalculatedVals = useMemo(() => {
    return computeCalculations(editShash, editMeetings, editRate, editPaymentMethod);
  }, [editShash, editMeetings, editRate, editPaymentMethod]);

  const logout = () => {
    setRole("guest");
    setActiveTrack(null);
    setIsExecutionViewActive(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" dir="rtl">
      {/* Top Gradient bar */}
      <div className="h-2 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 w-full" />

      {/* Main Container - AnimatePresence for transitions */}
      <AnimatePresence mode="wait">
        {role === "guest" ? (
          /* ================= LOGIN PORTAL ================= */
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="relative overflow-hidden flex-grow flex flex-col justify-center items-center bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 py-12 px-4 sm:px-6 lg:px-8"
          >
            {/* Soft blurred water balloons rising gently from the bottom of the login screen */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {[
                { size: 190, from: "from-emerald-300/40", to: "to-teal-400/30", left: "-6%", dx: 40, rise: -220, dur: 22, delay: 0, blur: "blur-xl" },
                { size: 140, from: "from-teal-300/40", to: "to-cyan-400/30", left: "82%", dx: -35, rise: -200, dur: 26, delay: 1.5, blur: "blur-xl" },
                { size: 110, from: "from-cyan-300/40", to: "to-emerald-400/30", left: "8%", dx: 30, rise: -180, dur: 24, delay: 0.8, blur: "blur-lg" },
                { size: 160, from: "from-emerald-200/40", to: "to-teal-300/30", left: "74%", dx: -25, rise: -240, dur: 28, delay: 2.2, blur: "blur-xl" },
                { size: 90, from: "from-teal-200/45", to: "to-cyan-300/30", left: "42%", dx: 20, rise: -160, dur: 20, delay: 1.1, blur: "blur-lg" },
                { size: 70, from: "from-emerald-300/45", to: "to-cyan-200/30", left: "20%", dx: 25, rise: -150, dur: 18, delay: 0.4, blur: "blur-md" },
                { size: 120, from: "from-cyan-200/40", to: "to-teal-300/30", left: "60%", dx: -20, rise: -190, dur: 25, delay: 1.9, blur: "blur-lg" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  className={`absolute rounded-full bg-gradient-to-br ${s.from} ${s.to} ${s.blur} shadow-inner opacity-60`}
                  style={{ width: s.size, height: s.size, bottom: "-8%", left: s.left }}
                  animate={{
                    x: [0, s.dx, -s.dx * 0.4, 0],
                    y: [0, s.rise, s.rise * 0.55, 0],
                    scale: [1, 1.08, 0.96, 1],
                  }}
                  transition={{
                    duration: s.dur,
                    delay: s.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-200 text-center overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600" />

              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-4 mt-2 ring-1 ring-slate-200 shadow-sm p-2">
                  <img
                    src="/logo.png"
                    alt="סמל סמינר שצ'רנסקי בית שמש"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  מערכת דיווח ובקרת שכר
                </h2>
                <p className="text-xs text-emerald-600 font-medium mt-1 bg-emerald-50/50 px-2.5 py-1 rounded-full border border-emerald-100/50">
                  סמינר שצ'רנסקי בית שמש • שנת תקציב תשפ"ז 🌾
                </p>
              </div>

              <div className="space-y-3 mt-8">
                <p className="text-xs text-slate-500 font-medium">
                  אנא בחרי את תפקידך במערכת כדי להתחיל בדיווח ובקרה:
                </p>

                {/* Director Entry Card */}
                <button
                  onClick={() => handleRoleSwitchInitiate("director")}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-150 group text-right cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-800 text-sm">
                        מנהלת סמינר
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                        צפייה בריכוז התקציב, סטטיסטיקות ואישורי שכר מדווחים
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors mr-2" />
                </button>

                {/* Secretary Entry Card */}
                <button
                  onClick={() => handleRoleSwitchInitiate("secretary")}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-150 group text-right cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-800 text-sm">
                        מזכירה
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                        הזנת נתונים ריכוזית, הפקת חוזים וניהול דיווחים שמורים
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors mr-2" />
                </button>

                {/* Coordinator Entry Card */}
                <button
                  onClick={() => handleRoleSwitchInitiate("coordinator")}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-150 group text-right cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <SignatureIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-800 text-sm">
                        רכזת מסלול
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                        דיווח שעות שנתיות, פרטי קשר ומעקב אחר תקציב המסלול
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors mr-2" />
                </button>
              </div>

              <div className="pt-4 text-[10px] text-slate-400 font-semibold border-t border-slate-100">
                מערכת דיווח ובקרת שכר ותקציב סמינר • שנת לימודים תשפ"ז
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= MAIN WORKSPACE ================= */
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen"
          >
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm no-print">
              <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row justify-between items-center py-4 lg:h-20 gap-4">
                  {/* Seminar Logo & Identity */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center ring-1 ring-slate-200 shadow-sm p-1">
                      <img
                        src="/logo.png"
                        alt="סמל סמינר שצ'רנסקי בית שמש"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
                        מערכת דיווח ובקרת שכר ותקציב
                      </h1>
                      <p className="text-[11px] text-slate-400 font-normal">
                        סמינר שצ'רנסקי בית שמש •{" "}
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                          שנת תקציב תשפ"ז 🌾
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Header actions and Roles switch */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col lg:items-end gap-1.5">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                        <button
                          onClick={() => handleRoleSwitchInitiate("director")}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${
                            role === "director"
                              ? "bg-white text-slate-900 border border-slate-200 shadow-sm font-semibold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          מנהלת סמינר
                        </button>
                        <button
                          onClick={() => handleRoleSwitchInitiate("secretary")}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${
                            role === "secretary"
                              ? "bg-white text-slate-900 border border-slate-200 shadow-sm font-semibold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          מזכירה
                        </button>
                        <button
                          onClick={() => handleRoleSwitchInitiate("coordinator")}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${
                            role === "coordinator"
                              ? "bg-white text-slate-900 border border-slate-200 shadow-sm font-semibold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          רכזת מסלול
                        </button>
                      </div>

                      <div className="flex gap-1.5 justify-start lg:justify-end flex-wrap">
                        {(role === "director" || role === "secretary") && (
                          <button
                            onClick={() => setShowRequestsQueueModal(true)}
                            className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold px-2.5 py-1 rounded border border-rose-200 transition-all shadow-sm cursor-pointer flex items-center gap-1"
                          >
                            <Inbox className="w-3 h-3" />
                            בקשות ממתינות
                            {changeRequests.length > 0 && (
                              <span className="bg-rose-600 text-white rounded-full px-1.5 text-[9px] font-black">
                                {changeRequests.length}
                              </span>
                            )}
                          </button>
                        )}

                        {role === "secretary" && (
                          <button
                            onClick={toggleExecutionView}
                            className="text-[10px] bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold px-2.5 py-1 rounded border border-emerald-200 transition-all shadow-sm cursor-pointer flex items-center gap-1"
                          >
                            <ChartLine className="w-3 h-3" />
                            {isExecutionViewActive ? "חזרה לניהול תקציב 📋" : "דיווח וביצוע שעות 📊"}
                          </button>
                        )}

                        {/* Password helper for Director only */}
                        {role === "director" && (
                          <button
                            onClick={() => setShowPasswordsHelperModal(true)}
                            className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-2.5 py-1 rounded border border-emerald-100 transition-all shadow-sm cursor-pointer"
                          >
                            <Key className="w-3 h-3 inline ml-1 text-emerald-500" /> ניהול סיסמאות רכזות 🔑
                          </button>
                        )}
                      </div>

                      {/* Sub-selector for Track when Coordinator is active.
                          Switching tracks requires entering the target track's password. */}
                      {role === "coordinator" && activeTrack && (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded border border-slate-200 text-[11px] text-slate-700">
                          <span className="font-medium px-1 text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" /> החלפת מסלול (דורש סיסמה):
                          </span>
                          <select
                            value={activeTrack}
                            onChange={(e) => {
                              const targetTrack = e.target.value;
                              if (targetTrack === activeTrack) return;
                              // Require the coordinator to authenticate with the target track's password.
                              setPendingRoleSwitch("coordinator");
                              handleCoordinatorTrackSelect(targetTrack);
                            }}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-semibold text-slate-800 focus:outline-none text-[11px] cursor-pointer"
                          >
                            {ALL_TRACKS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={logout}
                      className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/50 rounded border border-rose-100 transition-all duration-150 flex items-center gap-1 h-9 shadow-sm cursor-pointer"
                      title="התנתקות ונעילת מסך"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">התנתקות</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
              {!isExecutionViewActive ? (
              <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Budget Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      סה"כ תקציב שנתי מדווח
                    </span>
                    <h3 className="text-xl font-bold text-slate-800 mt-1">
                      ₪{metrics.totalBudget.toLocaleString()}
                    </h3>
                    <div className="mt-2">
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-100/50">
                        {role === "coordinator" ? `מסלול ${activeTrack}` : "כלל הסמינר"}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                    <Calculator className="w-5 h-5" />
                  </div>
                </div>

                {/* Approved Spend Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      שכר מאושר לתשלום
                    </span>
                    <h3 className="text-xl font-bold text-emerald-600 mt-1">
                      ₪{metrics.approvedBudget.toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-100">
                        {metrics.approvedPct}%
                      </span>
                      <span className="text-slate-400 font-medium text-[10px]">
                        {role === "coordinator" ? "ממסלול פעיל" : "מכלל התקציב"}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center text-emerald-600 border border-slate-100">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Saved Rows Progress Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      דיווחים שמורים במערכת
                    </span>
                    <h3 className="text-xl font-bold text-sky-600 mt-1">
                      {metrics.totalSaved} שורות
                    </h3>
                    <div className="mt-2">
                      <span className="text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded text-[10px] border border-sky-100">
                        פעיל במאגר הנתונים
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center text-sky-600 border border-slate-100">
                    <Cloud className="w-5 h-5" />
                  </div>
                </div>

                {/* Payment Forms Summary Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                  <div className="w-full">
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      פילוח משרות מדווחות
                    </span>
                    <div className="mt-1 flex flex-col text-[10px] text-slate-600 gap-1 font-medium">
                      <span className="flex justify-between">
                        <span className="text-slate-500">תקן (+45%):</span>
                        <strong className="text-slate-800 font-semibold">{metrics.countTenure}</strong>
                      </span>
                      <span className="flex justify-between">
                        <span className="text-slate-500">שכר מרצים (+30%):</span>
                        <strong className="text-slate-800 font-semibold">{metrics.countLecturer}</strong>
                      </span>
                      <span className="flex justify-between">
                        <span className="text-slate-500">קבלה (+18%):</span>
                        <strong className="text-slate-800 font-semibold">{metrics.countReceipt}</strong>
                      </span>
                      <span className="flex justify-between">
                        <span className="text-slate-500">קבלת פטור (0%):</span>
                        <strong className="text-slate-800 font-semibold">{metrics.countExempt}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Block */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 no-print">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                  {/* Filters fields */}
                  <div className="flex flex-wrap items-end gap-2.5 w-full lg:w-auto">
                    {/* Search Field */}
                    <div className="relative min-w-[180px] flex-grow sm:flex-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">חיפוש</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="מורה, מקצוע, ת.ז..."
                          className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-slate-700 h-9"
                        />
                      </div>
                    </div>

                    {/* Track filter */}
                    <div className="min-w-[140px] flex-grow sm:flex-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">התמחות / מסלול</label>
                      <select
                        value={filterTrack}
                        disabled={role === "coordinator"}
                        onChange={(e) => setFilterTrack(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all font-semibold bg-white cursor-pointer text-slate-700 h-9 ${
                          role === "coordinator" ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <option value="all">כל ההתמחויות</option>
                        {trackFilterOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Job type filter */}
                    <div className="min-w-[130px] flex-grow sm:flex-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">צורת תשלום</label>
                      <select
                        value={filterJobType}
                        onChange={(e) => setFilterJobType(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all font-semibold bg-white cursor-pointer text-slate-700 h-9"
                      >
                        <option value="all">כל צורות התשלום</option>
                        <option value="תקן">תקן (+45%)</option>
                        <option value="שכר מרצים">שכר מרצים (+30%)</option>
                        <option value="קבלה">קבלה (+18%)</option>
                        <option value="קבלת פטור">קבלת פטור (0%)</option>
                      </select>
                    </div>

                    {/* Year filter */}
                    <div className="min-w-[100px] flex-grow sm:flex-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">שנה</label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-slate-700 bg-white cursor-pointer font-semibold h-9"
                      >
                        <option value="all">כל השנים</option>
                        <option value="יג">שנה יג</option>
                        <option value="יד">שנה יד</option>
                        <option value="יג+יד">שנה יג+יד</option>
                      </select>
                    </div>

                    {/* Status filter */}
                    <div className="min-w-[120px] flex-grow sm:flex-none">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">סטטוס</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all text-slate-700 bg-white cursor-pointer h-9"
                      >
                        <option value="all">כל סטטוס הדיווח</option>
                        <option value="approved">מאושר לתשלום</option>
                        <option value="pending">ממתין לאישור</option>
                        <option value="saved">שמור במערכת</option>
                        <option value="contract_prepared">הוכן חוזה 📜</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={handleAddNewRow}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-1.5 rounded-lg text-xs shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center h-9"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>הוספת שורה</span>
                    </button>

                    <button
                      onClick={handleExportAlfon}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 py-1.5 rounded-lg text-xs shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center h-9"
                      title="ייצוא רשימת מורות, טלפונים ומיילים"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>אלפון מורות</span>
                    </button>

                    <button
                      onClick={() => setShowFinalReportModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-1.5 rounded-lg text-xs shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center h-9"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>דוח סופי 📋</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Coordinator sent requests tracking */}
              {role === "coordinator" && coordinatorSentRequests.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Send className="w-5 h-5 text-sky-600" />
                    <h3 className="font-bold text-slate-900">מעקב בקשות ששלחת 📤</h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="p-2">תאריך</th>
                          <th className="p-2">סוג בקשה</th>
                          <th className="p-2">מורה</th>
                          <th className="p-2">מקצוע</th>
                          <th className="p-2">תעריף שנתי נוכחי</th>
                          <th className="p-2">תעריף שנתי מבוקש</th>
                          <th className="p-2 text-center">הפרש כספי</th>
                          <th className="p-2 text-center">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {coordinatorSentRequests.map((req) => {
                          const isDelete = req.requestType === "delete";
                          const diff = req.proposed.totalAnnual - req.current.totalAnnual;
                          return (
                            <tr key={req.requestId} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-500">{req.timestamp}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full font-bold ${isDelete ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-sky-50 text-sky-700 border border-sky-200"}`}>
                                  {isDelete ? "מחיקת משרה" : "שינוי משרה"}
                                </span>
                              </td>
                              <td className="p-2 font-bold">{req.current.teacherName}</td>
                              <td className="p-2">{req.current.subject}</td>
                              <td className="p-2">₪{req.current.totalAnnual.toLocaleString()}</td>
                              <td className="p-2 font-bold">{isDelete ? "—" : `₪${req.proposed.totalAnnual.toLocaleString()}`}</td>
                              <td className={`p-2 text-center font-bold ${isDelete ? "text-rose-600" : diff >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                {isDelete ? `מחיקה ₪${req.current.totalAnnual.toLocaleString()}` : `${diff >= 0 ? "+" : ""}₪${diff.toLocaleString()}`}
                              </td>
                              <td className="p-2 text-center">
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                  ממתין לאישור ⏳
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Main Spreadsheet container */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-2 no-print">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <h2 className="font-semibold text-slate-800 text-sm">
                      טבלת ריכוז תקציב ונתוני שכר - תשפ"ז
                    </h2>
                  </div>
                  <div className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-150 font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      שימו לב: לא ניתן לשמור שורת מורה ללא הזנת מספר טלפון וכתובת אימייל תקינה!
                    </span>
                  </div>
                </div>

                <div className="overflow-auto max-h-[70vh]">
                  <table className="w-full text-right border-collapse table-fixed">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-200 border-b border-slate-300 text-slate-800 text-[11px] font-bold">
                        <th className="p-2 text-center w-[10%] bg-slate-300 text-slate-900 font-extrabold leading-tight">סטטוס וחוזים</th>
                        <th className="p-2 w-[5%] text-right hidden lg:table-cell leading-tight bg-slate-200">התמחות</th>
                        <th className="p-2 w-[3%] text-center leading-tight bg-slate-200">שנה</th>
                        <th className="p-2 w-[8%] text-right leading-tight bg-slate-200">שם המורה</th>
                        <th className="p-2 w-[7%] text-right hidden md:table-cell leading-tight bg-slate-200">שם המקצוע</th>
                        <th className="p-2 w-[6%] text-right leading-tight hidden lg:table-cell bg-slate-200">מחצית / מחזור</th>
                        <th className="p-2 w-[7%] text-center hidden lg:table-cell leading-tight bg-slate-200">צורת תשלום</th>
                        <th className="p-2 text-center w-[3%] leading-tight bg-slate-200">ש"ש</th>
                        <th className="p-2 text-center w-[3.5%] hidden md:table-cell leading-tight bg-slate-200" title="חודשים לתקן / מפגשים ליתר">מפג׳</th>
                        <th className="p-2 text-center w-[5%] bg-amber-100 text-amber-950 font-bold leading-tight">שעות שנתיות</th>
                        <th className="p-2 text-center w-[5%] hidden lg:table-cell leading-tight bg-slate-200">תעריף לשעה</th>
                        <th className="p-2 text-center w-[5%] bg-emerald-100 hidden xl:table-cell leading-tight">עלות מעביד</th>
                        <th className="p-2 text-center w-[6%] bg-emerald-200 text-emerald-950 font-extrabold leading-tight">סה"כ שנתי</th>
                        <th className="p-2 w-[5%] text-center leading-tight hidden lg:table-cell bg-slate-200">נסיעות</th>
                        <th className="p-2 w-[7%] text-center leading-tight hidden lg:table-cell bg-slate-200">מועד ציון</th>
                        <th className="p-2 text-center w-[5%] hidden xl:table-cell leading-tight bg-slate-200">ת.ז מורה</th>
                        <th className="p-2 text-center w-[6%] hidden lg:table-cell leading-tight bg-slate-200">טלפון *</th>
                        <th className="p-2 text-center w-[7%] hidden xl:table-cell leading-tight bg-slate-200">אימייל *</th>
                        <th className="p-2 text-center w-[6%] bg-slate-300 leading-tight">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={19} className="text-center py-12 text-slate-400 font-bold">
                            לא נמצאו משרות העונות על פילוח הסינון הנוכחי.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((item) => {
                          // Inline add-row: a new draft row is edited directly inside the table
                          // (no pop-up). Rendered as a single full-width cell so there is no
                          // horizontal scrolling on smaller screens.
                          if (item.id === activeEditingId && item.id < 0) {
                            return (
                              <tr key={item.id} className="bg-emerald-50/60">
                                <td colSpan={19} className="p-4 border-b-2 border-emerald-200">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                                      <Plus className="w-3.5 h-3.5" />
                                    </span>
                                    <h4 className="text-sm font-black text-emerald-900">הוספת משרה חדשה - מילוי ישיר בטבלה 🌾</h4>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">שם המורה *</label>
                                      <input
                                        type="text"
                                        value={editTeacherName}
                                        onChange={(e) => setEditTeacherName(e.target.value)}
                                        placeholder="שרה כהן"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">שם המקצוע *</label>
                                      <input
                                        type="text"
                                        value={editSubject}
                                        onChange={(e) => setEditSubject(e.target.value)}
                                        placeholder="פסיכולוגיה"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">מסלול</label>
                                      {role === "coordinator" ? (
                                        <div className="w-full px-2 py-1.5 border border-slate-100 rounded-lg text-xs bg-slate-50 text-slate-500 font-bold truncate">{editTrack}</div>
                                      ) : (
                                        <select
                                          value={editTrack}
                                          onChange={(e) => setEditTrack(e.target.value)}
                                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-semibold"
                                        >
                                          {ALL_TRACKS.map((t) => (<option key={t} value={t}>{t}</option>))}
                                        </select>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">שנה</label>
                                      <select
                                        value={editYear}
                                        onChange={(e) => setEditYear(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white"
                                      >
                                        <option value="יג">יג</option>
                                        <option value="יד">יד</option>
                                        <option value="יג+יד">יג+יד</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">מחצית / מחזור</label>
                                      <select
                                        value={editSemester}
                                        onChange={(e) => setEditSemester(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white"
                                      >
                                        {SEMESTER_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">צורת תשלום</label>
                                      <select
                                        value={editPaymentMethod}
                                        onChange={(e) => setEditPaymentMethod(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-semibold"
                                      >
                                        <option value="תקן">תקן (+45%)</option>
                                        <option value="שכר מרצים">שכר מרצים (+30%)</option>
                                        <option value="קבלה">קבלה (+18%)</option>
                                        <option value="קבלת פטור">קבלת פטור (0%)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ש"ש</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editShash || ""}
                                        onChange={(e) => setEditShash(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-semibold text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{editPaymentMethod === "תקן" ? "חודשים" : "מפגשים"}</label>
                                      <input
                                        type="number"
                                        value={editMeetings || ""}
                                        onChange={(e) => setEditMeetings(parseInt(e.target.value, 10) || 0)}
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-semibold text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">תעריף לשעה</label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={editRate || ""}
                                        onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-semibold text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">טלפון נייד *</label>
                                      <input
                                        type="text"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        placeholder="0501234567"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-mono text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">כתובת אימייל *</label>
                                      <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="name@domain.com"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ת.ז מורה</label>
                                      <input
                                        type="text"
                                        value={editTz}
                                        onChange={(e) => setEditTz(e.target.value)}
                                        placeholder="9 ספרות"
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white font-mono text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">נסיעות (עיר מוצא)</label>
                                      <select
                                        value={editTravel}
                                        onChange={(e) => setEditTravel(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white"
                                      >
                                        <option value="בית שמש">בית שמש</option>
                                        <option value="ירושלים">ירושלים</option>
                                        <option value="בני ברק">בני ברק</option>
                                        <option value="אלעד">אלעד</option>
                                        <option value="מודיעין עילית">מודיעין עילית</option>
                                        <option value="אחר / ללא">אחר / ללא</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">מועד נתינת ציון</label>
                                      <select
                                        value={editGradeTiming}
                                        onChange={(e) => setEditGradeTiming(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600 bg-white"
                                      >
                                        {GRADE_TIMING_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-emerald-200/60">
                                    <div className="flex flex-wrap gap-4 text-[11px] text-slate-600 bg-white rounded-lg px-3 py-2 border border-emerald-100">
                                      <span>שעות שנתיות: <strong className="text-slate-900">{activeCalculatedVals.totalHours}</strong></span>
                                      <span>עלות מעביד לשעה: <strong className="text-slate-900">₪{activeCalculatedVals.employerOverhead.toLocaleString()}</strong></span>
                                      <span>סה"כ שנתי: <strong className="text-emerald-700">₪{activeCalculatedVals.totalAnnual.toLocaleString()}</strong></span>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => handleCancelEdit(item.id)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                                      >
                                        ביטול
                                      </button>
                                      <button
                                        onClick={() => handleSaveRow(item.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> שמירת המשרה
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const jobCount = records.filter(
                            (r) =>
                              r.teacherName &&
                              r.teacherName.trim().toLowerCase() ===
                                item.teacherName.trim().toLowerCase()
                          ).length;

                          const multipleJobsBadge =
                            jobCount > 1 ? (
                              <span
                                className="text-emerald-600 font-black text-sm mr-1 select-none"
                                title={`מורה זו מלמדת ${jobCount} משרות/מקצועות בסמינר`}
                              >
                                *
                              </span>
                            ) : null;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                activeEditingId === item.id
                                  ? "bg-emerald-50/60 hover:bg-emerald-50/80 font-semibold"
                                  : item.isContractReady
                                  ? "bg-violet-100/80 hover:bg-violet-100"
                                  : item.isApproved
                                  ? "bg-emerald-50/10 hover:bg-emerald-50/20"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              {/* 1. STATUS & CONTRACT column */}
                              <td className="p-1.5 align-middle border-b border-slate-100 text-center bg-slate-50/30">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  {role === "director" ? (
                                    item.id > 0 ? (
                                      item.isApproved ? (
                                        <button
                                          onClick={() => handleToggleApproved(item.id, false)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2 py-1 rounded-lg shadow-sm cursor-pointer transition w-full max-w-[108px] text-center flex items-center justify-center gap-1 mx-auto"
                                        >
                                          <UserCheck className="w-3 h-3" /> מאושר
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleApproved(item.id, true)}
                                          className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 font-bold text-[10px] px-2 py-1 rounded-lg shadow-sm cursor-pointer transition w-full max-w-[108px] text-center flex items-center justify-center gap-1 mx-auto"
                                        >
                                          <UserX className="w-3 h-3" /> אשר כעת
                                        </button>
                                      )
                                    ) : (
                                      <button className="bg-slate-200 text-slate-500 font-bold text-[10px] px-2 py-1 rounded-lg border border-slate-300 w-full max-w-[108px] text-center cursor-not-allowed mx-auto">
                                        טיוטה 🔒
                                      </button>
                                    )
                                  ) : role === "secretary" ? (
                                    item.isApproved ? (
                                      <button
                                        onClick={() => {
                                          setActiveContractRecord(item);
                                          setShowContractModal(true);
                                        }}
                                        className={`font-extrabold text-[10px] px-2 py-1 rounded-lg shadow-sm cursor-pointer transition w-full max-w-[108px] text-center flex items-center justify-center gap-1 mx-auto leading-tight ${
                                          item.isContractReady
                                            ? "bg-violet-200/80 hover:bg-violet-300/80 text-violet-900 border border-violet-300"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                        }`}
                                      >
                                        <FileSignature className="w-3 h-3 shrink-0" />
                                        {item.isContractReady ? "חוזה מוכן 📜" : "הכיני חוזה 📜"}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-bold leading-tight">
                                        ממתין לאישור מנהלת
                                      </span>
                                    )
                                  ) : (
                                    /* Coordinator or guest status label */
                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 leading-tight ${
                                        item.isApproved
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                          : item.id < 0
                                          ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                                          : "bg-slate-100 text-slate-500 border border-slate-200"
                                      }`}
                                    >
                                      {item.isApproved ? (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                                          מאושר
                                        </>
                                      ) : item.id < 0 ? (
                                        "עריכה..."
                                      ) : (
                                        "ממתין לאישור"
                                      )}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* View-Only Columns */}
                              <td className="p-1.5 border-b border-slate-100 font-semibold text-slate-700 align-middle hidden lg:table-cell">
                                <AutoFitCellText className="font-semibold text-slate-700">{item.track}</AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center text-slate-500 font-medium align-middle">
                                <AutoFitCellText align="center" maxFontSize={10} className="text-slate-500 font-medium">
                                  {item.year}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 font-bold text-slate-900 align-middle">
                                <AutoFitCellText className="font-bold text-slate-900">{item.teacherName || "—"}</AutoFitCellText>
                                {multipleJobsBadge}
                              </td>
                              <td className="p-1.5 border-b border-slate-100 font-medium text-slate-800 align-middle hidden md:table-cell">
                                <AutoFitCellText className="font-medium text-slate-800">{item.subject || "—"}</AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-slate-600 align-middle hidden lg:table-cell">
                                <AutoFitCellText maxLines={2} className="text-slate-600">
                                  {formatSemesterDisplay(item.semester)}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center align-middle hidden lg:table-cell">
                                <span
                                  className={`px-1 py-0.5 rounded-full font-bold inline-block w-full max-w-full ${getPaymentMethodBadgeClass(item.paymentMethod)}`}
                                >
                                  <AutoFitCellText
                                    align="center"
                                    maxFontSize={9}
                                    minFontSize={6}
                                    maxLines={2}
                                    className="font-bold"
                                  >
                                    {item.paymentMethod}
                                    {item.paymentMethod === "תקן"
                                      ? " (+45%)"
                                      : item.paymentMethod === "שכר מרצים"
                                      ? " (+30%)"
                                      : item.paymentMethod === "קבלה"
                                      ? " (+18%)"
                                      : " (0%)"}
                                  </AutoFitCellText>
                                </span>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-medium align-middle">
                                <AutoFitCellText align="center" maxFontSize={10} className="font-medium">
                                  {item.shash}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-medium align-middle hidden md:table-cell">
                                <AutoFitCellText align="center" maxFontSize={10} className="font-medium">
                                  {item.meetings}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-extrabold text-slate-800 bg-amber-50/20 align-middle">
                                <AutoFitCellText align="center" maxFontSize={10} className="font-extrabold text-slate-800">
                                  {item.totalHours}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-semibold align-middle hidden lg:table-cell">
                                <AutoFitCellText align="center" maxFontSize={10} className="font-semibold">
                                  {`₪${item.rate}`}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-extrabold text-slate-900 bg-emerald-50/30 align-middle hidden xl:table-cell">
                                <AutoFitCellText align="center" maxFontSize={10} className="font-extrabold text-slate-900">
                                  {`₪${item.employerOverhead.toLocaleString()}`}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-black text-emerald-700 bg-emerald-50/50 align-middle">
                                <AutoFitCellText align="center" maxFontSize={10} className="font-black text-emerald-700">
                                  {`₪${item.totalAnnual.toLocaleString()}`}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-medium align-middle text-slate-700 hidden lg:table-cell">
                                <AutoFitCellText align="center" className="font-medium text-slate-700">
                                  {item.travel || "בית שמש"}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-medium align-middle text-slate-700 hidden lg:table-cell">
                                <AutoFitCellText align="center" maxLines={2} className="font-medium text-slate-700">
                                  {formatGradeTimingDisplay(item.gradeTiming) || "—"}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center font-mono align-middle hidden xl:table-cell">
                                <AutoFitCellText align="center" maxFontSize={10} minFontSize={6} className="font-mono">
                                  {item.tz || "—"}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center align-middle hidden lg:table-cell">
                                <AutoFitCellText align="center" maxFontSize={10} minFontSize={6} className="font-mono">
                                  {item.phone || "—"}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 align-middle hidden xl:table-cell">
                                <AutoFitCellText maxFontSize={10} minFontSize={6} className="font-mono text-slate-700">
                                  {item.email || "—"}
                                </AutoFitCellText>
                              </td>
                              <td className="p-1.5 border-b border-slate-100 text-center align-middle bg-slate-50/30">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {item.isApproved && role === "coordinator" ? (
                                    <>
                                      <button
                                        onClick={() => openSimulatorModal(item)}
                                        className="text-[10px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                                        title="הגשת בקשת עדכון משרה"
                                      >
                                        <Calculator className="w-3 h-3" /> בקשי שינוי
                                      </button>
                                      <button
                                        onClick={() => submitDeleteJobRequest(item)}
                                        className="text-[10px] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold p-1.5 rounded transition cursor-pointer flex items-center gap-1"
                                        title="בקשת מחיקת משרה (דורשת אישור מזכירה/מנהלת)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditRowStart(item)}
                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold p-1.5 rounded transition cursor-pointer"
                                        title="עריכת נתונים"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRow(item.id, item.teacherName)}
                                        className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold p-1.5 rounded transition cursor-pointer"
                                        title="מחיקת שורה"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Totals Bar */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex gap-4">
                    <div className="text-sm">
                      <span className="text-slate-500 font-semibold">שורות מוצגות:</span>{" "}
                      <strong className="text-slate-800 font-bold">
                        {filteredRecords.length}
                      </strong>{" "}
                      מתוך{" "}
                      <strong className="text-slate-800 font-bold">{records.length}</strong>
                    </div>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-sm">
                      <span className="text-slate-500 font-medium">
                        סה"כ שעות שנתיות לתלמידות:
                      </span>
                      <strong className="text-slate-900 text-base font-bold mr-1">
                        {filteredRecords
                          .reduce((sum, r) => sum + r.totalHours, 0)
                          .toLocaleString()}
                      </strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-sm">
                      <span className="text-emerald-600 font-bold">סך תקציב שכר מחושב בטבלה:</span>
                      <strong className="text-emerald-700 text-lg font-black mr-1">
                        ₪
                        {filteredRecords
                          .reduce((sum, r) => sum + r.totalAnnual, 0)
                          .toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Insights Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
                {/* Cumulative track budget split charts - visible to Director & Secretary only */}
                {(role === "director" || role === "secretary") && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-slate-800 text-sm">התפלגות תקציב לפי התמחויות</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-5 font-normal">
                    מציג את חלוקת ההוצאות המצטברת בהתאם לנתונים המוזנים כרגע במאגר תשפ"ז.
                  </p>

                  <div className="space-y-4">
                    {ALL_TRACKS.map((track) => {
                      const amount = trackBudgets.budgets[track] || 0;
                      const percentage =
                        trackBudgets.grandTotal > 0
                          ? Math.round((amount / trackBudgets.grandTotal) * 100)
                          : 0;

                      return (
                        <div key={track} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600">{track}</span>
                            <span className="text-emerald-950 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-bold text-[10px]">
                              ₪{amount.toLocaleString()} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {role === "director" && (
                    <div className="mt-6 pt-4 border-t border-slate-150 text-[11px] text-slate-400 flex flex-col gap-3 font-medium">
                      <span>* כולל תקורות ועלויות מעביד מלאות</span>
                      <button
                        onClick={() => { setWipeConfirmText(""); setShowWipeModal(true); }}
                        className="flex items-center justify-center gap-1.5 w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2 rounded-lg text-xs transition cursor-pointer"
                        title="מחיקת כל נתוני המערכת - מבוצע בסוף שנת לימודים בלבד"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        מחיקת כל הנתונים (סוף שנה)
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* Overhead formula reference guide */}
                <div className={`bg-white border border-slate-200 rounded-xl shadow-sm p-5 ${(role === "director" || role === "secretary") ? "lg:col-span-2" : "lg:col-span-3"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-semibold text-slate-800 text-sm">
                        מפת תקורות ונוסחאות שכר מותאמות
                      </h3>
                    </div>
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                      חישובים מבוקרי סמינר
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tenure Formula */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/50">
                      <h4 className="font-semibold text-xs text-emerald-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        משרת תקן (חודשי)
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-normal">
                        עלות המעביד כוללת תוספת של <strong>45%</strong>. שעות התלמידות מוכפלות ב-30
                        (משקף את השעות השנתיות), בעוד שכר המורה מחושב ישירות מתעריף השעה החודשית.
                      </p>
                      <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100/50 text-[10px] font-mono text-emerald-950 leading-relaxed">
                        שעות שנתיות לתלמידות = ש"ש × 30
                        <br />
                        עלות מעביד לשעה = תעריף לשעה × 1.45
                        <br />
                        סה"כ שנתי שכר = שעות שנתיות × עלות מעביד לשעה
                      </div>
                    </div>

                    {/* Lecturers Formula */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/50">
                      <h4 className="font-semibold text-xs text-emerald-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        שכר מרצים (מפגשים)
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-normal">
                        עלות המעביד כוללת תקורות של <strong>30%</strong>. החישוב מבוסס על מספר מפגשי
                        הוראה שנתיים בפועל.
                      </p>
                      <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100/50 text-[10px] font-mono text-emerald-950 leading-relaxed">
                        שעות שנתיות לתלמידות = ש"ש × מפגשים
                        <br />
                        עלות מעביד לשעה = תעריף לשעה × 1.30
                        <br />
                        סה"כ שנתי שכר = שעות שנתיות × עלות מעביד לשעה
                      </div>
                    </div>

                    {/* Receipt Formula */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/50">
                      <h4 className="font-semibold text-xs text-amber-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        קבלה (חיצוני)
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-normal">
                        עלות המעביד כוללת תוספת של <strong>18%</strong> בלבד על התעריף השעתי המדווח.
                      </p>
                      <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100/50 text-[10px] font-mono text-amber-950 leading-relaxed">
                        שעות שנתיות לתלמידות = ש"ש × מפגשים
                        <br />
                        עלות מעביד לשעה = תעריף לשעה × 1.18
                        <br />
                        סה"כ שנתי שכר = שעות שנתיות × עלות מעביד לשעה
                      </div>
                    </div>

                    {/* Exempt Formula */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/50">
                      <h4 className="font-semibold text-xs text-blue-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        קבלת פטור
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-normal">
                        שעות המוכפלות לפי המפגשים. התעריף נשאר ללא שינוי, ללא תקורות מעביד חיצוניות
                        (0%).
                      </p>
                      <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100/50 text-[10px] font-mono text-blue-950 leading-relaxed">
                        שעות שנתיות לתלמידות = ש"ש × מפגשים
                        <br />
                        עלות מעביד לשעה = תעריף לשעה
                        <br />
                        סה"כ שנתי שכר = שעות שנתיות × עלות מעביד לשעה
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              ) : (
              /* Execution reporting view */
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <ChartLine className="w-6 h-6 text-emerald-600" />
                      מערכת דיווח חודשי וביצוע שעות (שכר מרצים)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      המזכירה האחראית עוקבת ומעדכנת כאן שעות ביצוע מדווחות בפועל מול שעות שהוקצו לכל מורה.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExportExecutionToExcel}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      ייצוא לאקסל
                    </button>
                    <button
                      onClick={toggleExecutionView}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      חזרה לניהול תקציב וחוזים
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar mt-6">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-3">שם המורה</th>
                        <th className="p-3">שם המקצוע</th>
                        <th className="p-3 text-center bg-emerald-50/50">שעות שהוקצו</th>
                        <th className="p-3 text-center bg-emerald-50/50">תעריף</th>
                        {MONTH_LABELS.map((label) => (
                          <th key={label} className="p-2 text-center w-12">{label}</th>
                        ))}
                        <th className="p-3 text-center bg-emerald-50">שעות שבוצעו</th>
                        <th className="p-3 text-center bg-amber-50">יתרת שעות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.filter((r) => isExecutionEligible(r.paymentMethod)).length === 0 ? (
                        <tr>
                          <td colSpan={16} className="text-center py-10 text-slate-400 font-bold">
                            אין מורות לדיווח ביצוע (שכר מרצים / קבלה) במערכת כרגע.
                          </td>
                        </tr>
                      ) : (
                        records
                          .filter((r) => isExecutionEligible(r.paymentMethod))
                          .map((item) => {
                            const monthly = item.monthlyHours || {};
                            const totalDone = MONTH_KEYS.reduce((sum, m) => sum + (parseFloat(String(monthly[m] || 0)) || 0), 0);
                            const allocated = item.totalHours || 0;
                            const remaining = allocated - totalDone;
                            const isOver = remaining < 0;
                            return (
                              <tr key={item.id} className={isOver ? "bg-rose-50/80" : remaining === 0 ? "bg-emerald-50/50" : "hover:bg-slate-50"}>
                                <td className="p-3 font-bold">{item.teacherName}<span className="text-[10px] text-slate-400 block">{item.track} · {item.paymentMethod}</span></td>
                                <td className="p-3 text-slate-600 truncate max-w-[150px]">{item.subject}</td>
                                <td className="p-3 text-center bg-emerald-50/30 font-black">{allocated} ש'</td>
                                <td className="p-3 text-center bg-emerald-50/30 font-bold">₪{item.rate}</td>
                                {MONTH_KEYS.map((m) => (
                                  <td key={m} className="p-1 text-center">
                                    <input
                                      type="text"
                                      value={monthly[m] !== undefined ? monthly[m] : 0}
                                      onChange={(e) => updateMonthlyHourValue(item.id, m, e.target.value)}
                                      className="w-10 text-center text-xs font-bold border border-slate-200 rounded p-1 focus:outline-none focus:border-emerald-500 bg-white"
                                    />
                                  </td>
                                ))}
                                <td className="p-3 text-center bg-emerald-50 font-black">{totalDone} ש'</td>
                                <td className={`p-3 text-center font-black ${isOver ? "text-rose-700 bg-rose-100" : "bg-slate-100"}`}>
                                  {remaining} ש'
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* 1. PASSWORD ACCESS MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center relative overflow-hidden">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">כניסה מאובטחת</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 font-normal">
              {pendingRoleSwitch === "director"
                ? "אנא הזני סיסמת מנהלת סמינר"
                : pendingRoleSwitch === "secretary"
                ? "אנא הזני סיסמת מזכירה"
                : `אנא הזני סיסמת רכזת עבור מסלול ${pendingTrackSwitch}`}
            </p>

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 mb-2 h-10"
            />
            {passwordError && (
              <p className="text-red-500 text-xs font-bold mb-4">{passwordError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={submitPassword}
                className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                כניסה
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingRoleSwitch(null);
                  setPendingTrackSwitch(null);
                }}
                className="flex-grow bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. COORDINATOR TRACK SELECT MODAL */}
      {showCoordSelectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <h3 className="text-base font-semibold text-slate-800 mb-4 text-center">
              בחרי את מסלול ההתמחות שלך
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {ALL_TRACKS.map((track) => (
                <button
                  key={track}
                  onClick={() => handleCoordinatorTrackSelect(track)}
                  className="w-full text-right p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition text-xs font-semibold text-slate-700 flex justify-between items-center cursor-pointer shadow-sm"
                >
                  <span>רכזת מסלול {track}</span>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCoordSelectModal(false)}
              className="mt-4 w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold py-2 rounded-lg text-xs transition cursor-pointer"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* 4. PASSWORDS MANAGER HELPER MODAL */}
      {showPasswordsHelperModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <h3 className="text-base font-semibold text-slate-800 mb-3 text-center">
              ניהול סיסמאות רכזות דינמי
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 font-normal">
              המנהלת יכולה לצפות ולשנות מכאן את סיסמאות הכניסה של הרכזות בכל מסלול
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {ALL_TRACKS.map((track) => (
                <div
                  key={track}
                  className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/50 rounded-lg gap-4"
                >
                  <span className="text-xs font-semibold text-slate-600 w-32">רכזת {track}:</span>
                  <input
                    type="text"
                    value={passwords.coordinators[track] || ""}
                    onChange={(e) => {
                      const updated = { ...passwords.coordinators, [track]: e.target.value };
                      setPasswords({ ...passwords, coordinators: updated });
                    }}
                    className="border border-slate-200 rounded px-2 py-1 text-xs w-40 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSaveCoordinatorPasswords}
                className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                שמירת שינויים
              </button>
              <button
                onClick={() => setShowPasswordsHelperModal(false)}
                className="flex-grow bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTRACT PREVIEW MODAL */}
      {showContractModal && activeContractRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-teal-600" />
                <span>
                  הסכם העסקה מאוחד -{" "}
                  <span className="text-teal-700 font-bold">
                    {activeContractRecord.teacherName}
                  </span>
                </span>
              </h3>
              <button
                onClick={() => setShowContractModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-medium cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-grow overflow-y-auto bg-slate-50 p-4 rounded-lg border border-slate-200 font-sans text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
              {generatedContractText}
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <button
                onClick={handleCopyContract}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-4 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 h-9 shadow-sm"
              >
                <Copy className="w-4 h-4" /> העתקת חוזה
              </button>
              <button
                onClick={handleDownloadContract}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-4 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 h-9 shadow-sm"
              >
                <Download className="w-4 h-4" /> הורדה כקובץ טקסט
              </button>
              <button
                onClick={handleToggleContractStatus}
                className={`text-white font-medium py-1.5 px-4 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 h-9 shadow-sm ${
                  activeContractRecord.isContractReady
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {activeContractRecord.isContractReady ? "ביטול סימון חוזה" : "סמני כהוכן 📜"}
              </button>
              <button
                onClick={() => setShowContractModal(false)}
                className="flex-grow sm:flex-none bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium py-1.5 px-4 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. FINAL REPORT MODAL */}
      {showFinalReportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full p-6 shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>ריכוז דוח שכר ותקציב סופי - תשפ"ז</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  מציג <strong>{filteredRecords.length}</strong> משרות מסוננות בהתאם לפילוח הנבחר.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition h-9"
                >
                  <FileSpreadsheet className="w-4 h-4" /> ייצוא לאקסל
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition h-9"
                >
                  <Printer className="w-4 h-4" /> הדפסת דוח
                </button>
                <button
                  onClick={() => setShowFinalReportModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-medium cursor-pointer px-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Scrollable table area */}
            <div className="flex-grow overflow-y-auto my-4 border border-slate-200 rounded-lg bg-slate-50/50 p-3 print:bg-white print:border-none">
              <table className="w-full text-right border-collapse text-[11px] whitespace-nowrap bg-white shadow-sm rounded-lg overflow-hidden print:shadow-none">
                <thead>
                  <tr className="bg-slate-850 text-white font-semibold">
                    <th className="border border-slate-200 p-2 text-right">התמחות</th>
                    <th className="border border-slate-200 p-2 text-center">שנה</th>
                    <th className="border border-slate-200 p-2 text-right">שם המורה</th>
                    <th className="border border-slate-200 p-2 text-right">שם המקצוע</th>
                    <th className="border border-slate-200 p-2 text-right">מחצית / מחזור</th>
                    <th className="border border-slate-200 p-2 text-center">צורת תשלום</th>
                    <th className="border border-slate-200 p-2 text-center">ש"ש</th>
                    <th className="border border-slate-200 p-2 text-center">מפגשים/חודשים</th>
                    <th className="border border-slate-200 p-2 text-center bg-amber-500/10 text-amber-950 font-semibold">
                      שעות שנתיות
                    </th>
                    <th className="border border-slate-200 p-2 text-center">תעריף שעה</th>
                    <th className="border border-slate-200 p-2 text-center bg-emerald-50/50 text-emerald-950">
                      עלות מעביד לשעה
                    </th>
                    <th className="border border-slate-200 p-2 text-center bg-emerald-600 text-white font-semibold">
                      סה"כ שנתי שכר
                    </th>
                    <th className="border border-slate-200 p-2 text-center">סטטוס אישור</th>
                    <th className="border border-slate-200 p-2 text-center">נסיעות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.map((item) => (
                    <tr
                      key={item.id}
                      className={`text-slate-800 transition-colors ${
                        item.isContractReady
                          ? "bg-violet-100/70 print:bg-violet-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="border border-slate-200 p-2 font-medium">{item.track}</td>
                      <td className="border border-slate-200 p-2 text-center">{item.year}</td>
                      <td className="border border-slate-200 p-2 font-bold max-w-[200px] truncate">
                        {item.teacherName}
                      </td>
                      <td className="border border-slate-200 p-2 max-w-[200px] truncate text-slate-600">
                        {item.subject}
                      </td>
                      <td className="border border-slate-200 p-2 text-right text-slate-500">
                        {formatSemesterDisplay(item.semester)}
                      </td>
                      <td className="border border-slate-200 p-2 text-center font-medium">
                        {item.paymentMethod}
                      </td>
                      <td className="border border-slate-200 p-2 text-center">
                        {item.shash}
                      </td>
                      <td className="border border-slate-200 p-2 text-center text-slate-500">
                        {item.meetings}
                      </td>
                      <td className="border border-slate-200 p-2 text-center bg-amber-500/5 font-bold text-amber-950">
                        {item.totalHours}
                      </td>
                      <td className="border border-slate-200 p-2 text-center">₪{item.rate}</td>
                      <td className="border border-slate-200 p-2 text-center bg-emerald-50/10 font-medium text-emerald-900">
                        ₪{item.employerOverhead.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-center bg-emerald-50 font-bold text-emerald-950">
                        ₪{item.totalAnnual.toLocaleString()}
                      </td>
                      <td
                        className={`border border-slate-200 p-2 text-center font-bold text-[10px] ${
                          item.isApproved
                            ? "text-emerald-700 bg-emerald-50/50"
                            : "text-amber-700 bg-amber-50/50"
                        }`}
                      >
                        {item.isApproved ? "מאושר" : "ממתין"}
                      </td>
                      <td className="border border-slate-200 p-2 text-center font-medium text-[10px] text-slate-700 bg-slate-50/50">
                        {item.travel || "בית שמש"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 text-slate-900 font-semibold text-xs border-t-2 border-slate-300">
                    <td colSpan={6} className="border border-slate-200 p-3 text-left font-bold text-slate-700 bg-slate-100">
                      סיכום דוח כולל:
                    </td>
                    <td className="border border-slate-200 p-3 text-center bg-slate-100" />
                    <td className="border border-slate-200 p-3 text-center bg-slate-100" />
                    <td className="border border-slate-200 p-3 text-center bg-amber-50 text-amber-950 font-bold text-xs">
                      {filteredRecords.reduce((sum, r) => sum + r.totalHours, 0).toLocaleString()}
                    </td>
                    <td className="border border-slate-200 p-3 text-center bg-slate-100" />
                    <td className="border border-slate-200 p-3 text-center bg-slate-100" />
                    <td className="border border-slate-200 p-3 text-center bg-emerald-100/50 text-emerald-950 font-bold text-sm">
                      ₪{filteredRecords.reduce((sum, r) => sum + r.totalAnnual, 0).toLocaleString()}
                    </td>
                    <td className="border border-slate-200 p-3 text-center bg-slate-100" />
                    <td className="border border-slate-200 p-3 text-center bg-slate-100" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowFinalReportModal(false)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium text-xs px-5 py-1.5 rounded-lg transition cursor-pointer shadow-sm h-9"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. EDIT EXISTING RECORD MODAL (adding a new row is done inline in the table) */}
      {editModalId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-850">
                    עריכת פרטי משרה
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {`עדכון נתוני השכר והתפקיד של ${editTeacherName || "המורה"}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCancelEdit(editModalId)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form Fields Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Alert notice about required fields */}
              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200/60 rounded-xl text-xs flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <div className="font-normal leading-relaxed text-right">
                  שימו לב: שדות המסומנים ב-<strong>*</strong> הם שדות חובה. לא ניתן לשמור שורת מורה ללא מספר טלפון ואימייל תקינים!
                </div>
              </div>

              {/* SECTION 1: Teacher's Identity & Contact */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-3 tracking-wider uppercase flex items-center gap-1.5 justify-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>פרטי זהות וקשר של המורה</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">שם המורה *</label>
                    <input
                      type="text"
                      placeholder="לדוגמה: שרה כהן"
                      value={editTeacherName}
                      onChange={(e) => setEditTeacherName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">תעודת זהות מורה</label>
                    <input
                      type="text"
                      placeholder="9 ספרות"
                      value={editTz}
                      onChange={(e) => setEditTz(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">טלפון נייד *</label>
                    <input
                      type="text"
                      placeholder="לדוגמה: 0501234567"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">כתובת אימייל *</label>
                    <input
                      type="email"
                      placeholder="name@domain.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Academic details */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-400 mb-3 tracking-wider uppercase flex items-center gap-1.5 justify-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>פרטי משרה והתמחות</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">מסלול התמחות / מחלקה</label>
                    {role === "coordinator" ? (
                      <div className="w-full px-3 py-2 border border-slate-100 rounded-lg text-xs bg-slate-50 text-slate-500 font-bold">
                        {editTrack}
                      </div>
                    ) : (
                      <select
                        value={editTrack}
                        onChange={(e) => setEditTrack(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-semibold"
                      >
                        {ALL_TRACKS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">שנת לימודים</label>
                    <select
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white"
                    >
                      <option value="יג">שנה יג</option>
                      <option value="יד">שנה יד</option>
                      <option value="יג+יד">שנה יג+יד</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">שם המקצוע *</label>
                    <input
                      type="text"
                      placeholder="לדוגמה: פסיכולוגיה התפתחותית"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">מחצית / מחזור</label>
                    <select
                      value={editSemester}
                      onChange={(e) => setEditSemester(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white"
                    >
                      {SEMESTER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Cost and calculations */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-400 mb-3 tracking-wider uppercase flex items-center gap-1.5 justify-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>נתוני שכר, הגעה וציונים</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">צורת תשלום</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-semibold"
                    >
                      <option value="תקן">תקן (+45% תקורות)</option>
                      <option value="שכר מרצים">שכר מרצים (+30% תקורות)</option>
                      <option value="קבלה">קבלה (+18% תקורות)</option>
                      <option value="קבלת פטור">קבלת פטור (0% תקורות)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">שעות שבועיות (ש"ש)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={editShash || ""}
                      onChange={(e) => setEditShash(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">
                      {editPaymentMethod === "תקן" ? "מספר חודשים בשנה" : "מספר מפגשים שנתי"}
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={editMeetings || ""}
                      onChange={(e) => setEditMeetings(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">תעריף יסוד לשעה (ש"ח)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={editRate || ""}
                      onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">נסיעות (עיר מוצא)</label>
                    <select
                      value={editTravel}
                      onChange={(e) => setEditTravel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-medium"
                    >
                      <option value="בית שמש">בית שמש</option>
                      <option value="ירושלים">ירושלים</option>
                      <option value="בני ברק">בני ברק</option>
                      <option value="אלעד">אלעד</option>
                      <option value="מודיעין עילית">מודיעין עילית</option>
                      <option value="אחר / ללא">אחר / ללא</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 text-right">מועד נתינת ציון</label>
                    <select
                      value={editGradeTiming}
                      onChange={(e) => setEditGradeTiming(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600 bg-white font-medium"
                    >
                      {GRADE_TIMING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* LIVE CALCULATIONS SUMMARY PANEL */}
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="font-bold text-emerald-950 flex items-center gap-1 justify-start">
                    <span>סיכום חישוב שכר ותקורות חי ⚡</span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 mt-0.5">
                    הנוסחאות מחושבות ומשוערכות אוטומטית בהתאם לצורת התשלום הנבחרת.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center w-full sm:w-auto shrink-0 border-t sm:border-t-0 sm:border-r border-emerald-150 pt-3 sm:pt-0 sm:pr-4">
                  <div>
                    <span className="text-[10px] text-slate-500 block">שעות שנתיות</span>
                    <strong className="text-sm font-black text-slate-800">
                      {computeCalculations(editShash, editMeetings, editRate, editPaymentMethod).totalHours} שעות
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">עלות מעביד לשעה</span>
                    <strong className="text-sm font-black text-slate-800">
                      ₪{computeCalculations(editShash, editMeetings, editRate, editPaymentMethod).employerOverhead.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block">סה"כ שנתי שכר</span>
                    <strong className="text-sm font-black text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200/50">
                      ₪{computeCalculations(editShash, editMeetings, editRate, editPaymentMethod).totalAnnual.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => handleCancelEdit(editModalId)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={() => editModalId !== null && handleSaveRow(editModalId)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm transition cursor-pointer"
              >
                שמירת שינויים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. SIMULATOR & CHANGE REQUEST MODAL */}
      {showSimulatorModal && simulatingRow && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                סימולטור ובקשת עדכון משרה - <span className="text-emerald-600">{simulatingRow.teacherName}</span>
              </h3>
              <button onClick={closeSimulatorModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-5 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">מצב מאושר נוכחי</span>
                  <div className="mt-2 text-xs space-y-1 font-semibold text-slate-700">
                    <div>מקצוע: {simulatingRow.subject}</div>
                    <div>צורת תשלום: {simulatingRow.paymentMethod}</div>
                    <div>שעות שנתיות: {simulatingRow.totalHours}</div>
                    <div>תעריף: ₪{simulatingRow.rate}</div>
                    <div className="pt-2 text-sm font-black border-t border-slate-200 mt-2">סה"כ שנתי: ₪{simulatingRow.totalAnnual.toLocaleString()}</div>
                  </div>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">מצב מוצע (סימולציה)</span>
                  <div className="mt-2 text-xs space-y-1 font-semibold text-emerald-950">
                    <div>מקצוע: {simSubject}</div>
                    <div>צורת תשלום: {simPaymentMethod}</div>
                    <div>שעות שנתיות: {simCalculations.totalHours}</div>
                    <div>תעריף: ₪{simRate}</div>
                    <div className="pt-2 text-sm font-black border-t border-emerald-200 mt-2">סה"כ שנתי מוצע: ₪{simCalculations.totalAnnual.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">שם המורה</label>
                  <input type="text" value={simName} onChange={(e) => setSimName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">שם המקצוע</label>
                  <input type="text" value={simSubject} onChange={(e) => setSimSubject(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">מחצית / מחזור</label>
                  <select value={simSemester} onChange={(e) => setSimSemester(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                    {SEMESTER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">צורת תשלום</label>
                  <select value={simPaymentMethod} onChange={(e) => setSimPaymentMethod(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                    <option value="תקן">תקן (+45%)</option>
                    <option value="שכר מרצים">שכר מרצים (+30%)</option>
                    <option value="קבלה">קבלה (+18%)</option>
                    <option value="קבלת פטור">קבלת פטור (0%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ש"ש</label>
                  <input type="text" value={simShash} onChange={(e) => setSimShash(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">מפגשים/חודשים</label>
                  <input type="text" value={simMeetings} onChange={(e) => setSimMeetings(parseInt(e.target.value) || 0)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">תעריף לשעה</label>
                  <input type="text" value={simRate} onChange={(e) => setSimRate(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">נסיעות</label>
                  <select value={simTravel} onChange={(e) => setSimTravel(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500">
                    <option value="בית שמש">בית שמש</option>
                    <option value="ירושלים">ירושלים</option>
                    <option value="ביתר">ביתר</option>
                    <option value="מודיעין עילית">מודיעין עילית</option>
                    <option value="בני ברק">בני ברק</option>
                  </select>
                </div>
              </div>
              {simBudgetStatus && (
                <div className={`p-4 rounded-2xl border text-xs font-semibold ${simBudgetStatus.remaining >= 0 ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-rose-50 text-rose-900 border-rose-200"}`}>
                  {simBudgetStatus.remaining >= 0 ? (
                    <>
                      <div className="font-extrabold text-emerald-800">סטטוס תקציב מסלול {simBudgetStatus.track}: תקין ✅</div>
                      <div>הפרש שינוי: {simBudgetStatus.difference >= 0 ? "+" : ""}₪{simBudgetStatus.difference.toLocaleString()}</div>
                      <div>יתרה פנויה: ₪{simBudgetStatus.remaining.toLocaleString()} (מתוך ₪{simBudgetStatus.limit.toLocaleString()})</div>
                    </>
                  ) : (
                    <>
                      <div className="font-extrabold text-rose-800">🔴 אזהרה: השינוי יוצר חריגה מתקציב המסלול!</div>
                      <div>הפרש שינוי: +₪{simBudgetStatus.difference.toLocaleString()}</div>
                      <div>חריגה: ₪{Math.abs(simBudgetStatus.remaining).toLocaleString()}</div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5 pt-3 border-t">
              <button onClick={submitChangeRequest} className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer flex items-center justify-center gap-1">
                <Send className="w-4 h-4" /> שלחי בקשת שינוי למזכירה 📤
              </button>
              <button onClick={closeSimulatorModal} className="flex-grow bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm transition cursor-pointer">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* 11. CHANGE REQUESTS QUEUE MODAL */}
      {showRequestsQueueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-rose-600" />
                בקשות ממתינות לאישור - תשפ"ז
              </h3>
              <button onClick={() => setShowRequestsQueueModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 space-y-4">
              {changeRequests.length === 0 ? (
                <div className="p-10 text-center font-bold text-slate-400">אין בקשות הממתינות לאישור כעת.</div>
              ) : (
                changeRequests.map((req) => {
                  const isDelete = req.requestType === "delete";
                  const diff = req.proposed.totalAnnual - req.current.totalAnnual;
                  return (
                    <div
                      key={req.requestId}
                      className={`border rounded-2xl p-4 space-y-3 ${
                        isDelete ? "bg-rose-50/40 border-rose-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">רכזת מסלול: {req.track}</span>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              isDelete
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-sky-100 text-sky-800 border border-sky-200"
                            }`}
                          >
                            {isDelete ? "בקשת מחיקת משרה" : "בקשת שינוי משרה"}
                          </span>
                          <span className="text-[11px] text-slate-400">הוגש ב: {req.timestamp}</span>
                        </div>
                        {!isDelete && (
                          <span className={`text-xs font-bold ${diff >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {diff >= 0 ? `תוספת של ₪${diff.toLocaleString()}` : `חיסכון של ₪${Math.abs(diff).toLocaleString()}`}
                          </span>
                        )}
                      </div>
                      {isDelete ? (
                        <div className="bg-white p-3 rounded-xl border border-rose-100 text-xs space-y-1">
                          <span className="font-bold text-rose-600 block mb-1">משרה למחיקה (כולל התקציב)</span>
                          <p>מורה: <strong>{req.current.teacherName}</strong></p>
                          <p>מקצוע: {req.current.subject} ({formatSemesterDisplay(req.current.semester)})</p>
                          <p>צורת תשלום: {req.current.paymentMethod}</p>
                          <p>עלות שנתית שתוסר: <strong className="text-rose-700">₪{req.current.totalAnnual.toLocaleString()}</strong></p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-150">
                            <span className="font-bold text-slate-400 block mb-1">מצב מאושר נוכחי</span>
                            <p>מורה: <strong>{req.current.teacherName}</strong></p>
                            <p>מקצוע: {req.current.subject}</p>
                            <p>עלות שנתית: <strong>₪{req.current.totalAnnual.toLocaleString()}</strong></p>
                          </div>
                          <div className="bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/50">
                            <span className="font-bold text-emerald-500 block mb-1">שינוי מוצע מבוקש</span>
                            <p>מורה: <strong>{req.proposed.teacherName}</strong></p>
                            <p>מקצוע: {req.proposed.subject} ({formatSemesterDisplay(req.proposed.semester)})</p>
                            <p>עלות מוצעת: <strong className="text-emerald-700">₪{req.proposed.totalAnnual.toLocaleString()}</strong></p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          onClick={() => approveChangeRequest(req.requestId)}
                          className={`font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer text-white ${
                            isDelete ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {isDelete ? "אשרי מחיקה ✅" : "אשר ועדכן ✅"}
                        </button>
                        <button onClick={() => rejectChangeRequest(req.requestId)} className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer">
                          דחה בקשה ❌
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-end pt-3 border-t mt-4">
              <button onClick={() => setShowRequestsQueueModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-5 rounded-xl text-xs transition cursor-pointer">סגירה</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CUSTOM SYSTEM ALERTS */}
      {alertConfig && alertConfig.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center relative overflow-hidden">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-4 border ${
                alertConfig.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : alertConfig.type === "error"
                  ? "bg-rose-50 text-rose-600 border-rose-100"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
              }`}
            >
              {alertConfig.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : alertConfig.type === "error" ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-850">{alertConfig.title}</h3>
            <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed font-normal">
              {alertConfig.text}
            </p>
            <button
              onClick={() => setAlertConfig(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-xs transition cursor-pointer shadow-sm h-9"
            >
              סגירה
            </button>
          </div>
        </div>
      )}

      {/* 8. CUSTOM SYSTEM CONFIRMS */}
      {confirmConfig && confirmConfig.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center relative overflow-hidden">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-850">אישור פעולה</h3>
            <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed font-normal">
              {confirmConfig.text}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm h-9"
              >
                כן, בצע
              </button>
              <button
                onClick={() => setConfirmConfig(null)}
                className="flex-grow bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium py-1.5 rounded-lg text-xs transition cursor-pointer shadow-sm h-9"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. END-OF-YEAR PERMANENT WIPE MODAL (Director only) */}
      {showWipeModal && role === "director" && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-rose-600" />
            <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center mx-auto mb-4 mt-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">מחיקת כל נתוני המערכת</h3>
            <p className="text-xs text-slate-500 mt-2 mb-4 leading-relaxed font-normal">
              פעולה זו בלתי הפיכה ותמחק לצמיתות את <strong>כל</strong> נתוני השכר והתקציב במערכת.
              היא מיועדת לביצוע בסוף שנת לימודים בלבד.
              <br />
              כדי לאשר, הקלידי במדויק את הביטוי: <strong className="text-rose-700">{WIPE_CONFIRM_PHRASE}</strong>
            </p>
            <input
              type="text"
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder={WIPE_CONFIRM_PHRASE}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmWipe}
                disabled={wipeConfirmText.trim() !== WIPE_CONFIRM_PHRASE || loading}
                className="flex-grow bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer shadow-sm"
              >
                מחיקה לצמיתות
              </button>
              <button
                onClick={() => { setShowWipeModal(false); setWipeConfirmText(""); }}
                className="flex-grow bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold py-2 rounded-lg text-xs transition cursor-pointer shadow-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
