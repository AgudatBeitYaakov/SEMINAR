import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  Key,
  Cloud,
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
  FileSignature as SignatureIcon
} from "lucide-react";
import { SalaryRecord, UserRole } from "./types";

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
  const [showDbConfigModal, setShowDbConfigModal] = useState(false);

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

  // Custom alert & confirm states
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; text: string; type: "success" | "error" | "info"; title: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean; text: string; onConfirm: () => void } | null>(null);

  // Load configuration from LocalStorage and backend API on mount
  useEffect(() => {
    // Passwords
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

    fetchRecords();
  }, []);

  // Fetch from Express Server
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/records");
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
        setDbMode(data.dbMode);
      }
    } catch (err) {
      console.error("API error, operating in local fallback state", err);
      setDbMode("local");
    } finally {
      setLoading(false);
    }
  };

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

  // Helper alerts and confirms
  const triggerAlert = (text: string, type: "success" | "error" | "info" = "success", title = "הודעת מערכת") => {
    setAlertConfig({ show: true, text, type, title });
  };

  const triggerConfirm = (text: string, onConfirm: () => void) => {
    setConfirmConfig({ show: true, text, onConfirm });
  };

  // Save database URL custom configuration to Express backend
  const handleSaveDbUrl = async () => {
    try {
      const response = await fetch("/api/configure-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: customDbUrl }),
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("sz_cloud_api_url_v2", customDbUrl);
        setDbMode(data.dbMode);
        triggerAlert("החיבור לענן גוגל שיטס / Supabase עודכן בהצלחה!", "success", "עדכון חיבור");
        setShowDbConfigModal(false);
        fetchRecords();
      } else {
        triggerAlert("העדכון נכשל, ודאי שהקישור תקין", "error", "שגיאת חיבור");
      }
    } catch (e) {
      triggerAlert("תקלת תקשורת מול השרת", "error");
    }
  };

  const handleClearDbUrl = async () => {
    setCustomDbUrl("");
    localStorage.removeItem("sz_cloud_api_url_v2");
    try {
      await fetch("/api/configure-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: "" }),
      });
      setDbMode("local");
      triggerAlert("חיבור הענן בוטל. האפליקציה פועלת כעת במצב מקומי.", "info", "ניתוק חיבור");
      setShowDbConfigModal(false);
      fetchRecords();
    } catch (e) {
      setDbMode("local");
      setShowDbConfigModal(false);
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
      isContractReady: false
    };

    setRecords([newRow, ...records]);
    handleEditRowStart(newRow);
  };

  const handleEditRowStart = (row: SalaryRecord) => {
    setActiveEditingId(row.id);
    setEditTrack(row.track);
    setEditYear(row.year);
    setEditTeacherName(row.teacherName);
    setEditSubject(row.subject);
    setEditSemester(row.semester);
    setEditPaymentMethod(row.paymentMethod);
    setEditShash(row.shash);
    setEditMeetings(row.meetings);
    setEditRate(row.rate);
    setEditTz(row.tz);
    setEditPhone(row.phone);
    setEditEmail(row.email);
  };

  const handleCancelEdit = (id: number) => {
    if (id < 0) {
      // Remove newly created row draft
      setRecords(records.filter((r) => r.id !== id));
    }
    setActiveEditingId(null);
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
      isContractReady: matchRow ? matchRow.isContractReady : false
    };

    setLoading(true);
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRow),
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert(`משרת המורה "${updatedRow.teacherName}" נשמרה בהצלחה במערכת!`, "success", "נשמר בהצלחה");
        setActiveEditingId(null);
        fetchRecords();
      } else {
        triggerAlert("שגיאה בשמירת השורה", "error");
      }
    } catch (err) {
      triggerAlert("תקלת רשת בשמירה", "error");
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
        const data = await response.json();
        if (data.success) {
          triggerAlert("השורה נמחקה בהצלחה מהמערכת.", "success");
          fetchRecords();
        } else {
          triggerAlert("שגיאה במחיקת השורה", "error");
        }
      } catch (err) {
        triggerAlert("שגיאת תקשורת במחיקה", "error");
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
      const data = await response.json();
      if (data.success) {
        triggerAlert(
          `משרת המורה "${row.teacherName}" ${approvedStatus ? "אושרה לתשלום בהצלחה!" : "הועברה חזרה למצב ממתין לאישור."}`,
          "success"
        );
        fetchRecords();
      }
    } catch (e) {
      triggerAlert("שגיאה בעדכון סטטוס אישור", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoordinatorPasswords = () => {
    localStorage.setItem("sz_passwords_store_v2", JSON.stringify(passwords));
    triggerAlert("סיסמאות הרכזות עודכנו ונשמרו בהצלחה במערכת!", "success");
    setShowPasswordsHelperModal(false);
  };

  // Clear system data
  const handleClearAllData = () => {
    triggerConfirm("אזהרה חמורה: פעולה זו תמחק לחלוטין את כל המידע המקומי בטבלה. האם את בטוחה שברצונך לבצע איפוס מוחלט?", async () => {
      // For local clear, we can just bulk delete or recreate. In our simplified architecture:
      // Let's send requests or alert that we clear local storage state.
      // We will do a full data purge.
      for (const r of records) {
        await fetch(`/api/records/${r.id}`, { method: "DELETE" });
      }
      triggerAlert("הנתונים אופסו בהצלחה. המערכת ריקה כעת.", "success");
      fetchRecords();
    });
  };

  // Filter application
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      // If coordinator, enforce their track filter
      if (role === "coordinator" && activeTrack && item.track !== activeTrack) {
        return false;
      }
      
      if (filterTrack !== "all" && item.track !== filterTrack) return false;
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
      const formattedSemester = row.semester.includes("סמסטר א'") ? "סמסטר א'" : row.semester.includes("סמסטר ב'") ? "סמסטר ב'" : "שנתי";
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
    const isCurrentlyReady = activeContractRecord.isContractReady;
    const newStatus = !isCurrentlyReady;

    const teacherRows = records.filter(
      (r) => r.teacherName && r.teacherName.trim().toLowerCase() === nameLower
    );

    setLoading(true);
    try {
      for (const row of teacherRows) {
        const updated = { ...row, isContractReady: newStatus };
        await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
      }
      triggerAlert(
        `סטטוס החוזה עבור "${activeContractRecord.teacherName}" עודכן בהצלחה לכלל משרותיה!`,
        "success"
      );
      setShowContractModal(false);
      fetchRecords();
    } catch (e) {
      triggerAlert("תקלה בעדכון סטטוס חוזה", "error");
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

    let csv = "\uFEFFהתמחות,שנה,שם המורה,שם המקצוע,סמסטר / מחזור,צורת תשלום,ש\"ש,מפגשים/חודשים,שעות תלמידות שנתי,תעריף שעה,עלות מעביד,סה\"כ שנתי שכר,סטטוס אישור,סטטוס חוזה\n";
    let totalHoursSum = 0;
    let totalBudgetSum = 0;

    filteredRecords.forEach((item) => {
      const statusStr = item.isApproved ? "מאושר לתשלום" : "ממתין לאישור";
      const contractStr = item.isContractReady ? "הוכן חוזה 📜" : "הכיני חוזה 📜";
      const methodStr = `${item.paymentMethod} (${item.paymentMethod === "תקן" ? "+45%" : item.paymentMethod === "שכר מרצים" ? "+30%" : item.paymentMethod === "קבלה" ? "+18%" : "0%"})`;

      csv += `"${item.track || ""}","${item.year || ""}","${item.teacherName || ""}","${item.subject || ""}","${item.semester || ""}","${methodStr}",${item.shash},${item.meetings},${item.totalHours},${item.rate},${item.employerOverhead},${item.totalAnnual},"${statusStr}","${contractStr}"\n`;

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

  // Live calculation updater for active editing row
  const activeCalculatedVals = useMemo(() => {
    return computeCalculations(editShash, editMeetings, editRate, editPaymentMethod);
  }, [editShash, editMeetings, editRate, editPaymentMethod]);

  const logout = () => {
    setRole("guest");
    setActiveTrack(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" dir="rtl">
      {/* Top Gradient bar */}
      <div className="h-2 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 w-full" />

      {/* Main Container - AnimatePresence for transitions */}
      <AnimatePresence mode="wait">
        {role === "guest" ? (
          /* ================= LOGIN PORTAL ================= */
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-grow flex flex-col justify-center items-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-indigo-600" />

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-100 mb-4">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  מערכת דיווח ובקרת שכר
                </h2>
                <p className="text-xs text-indigo-600 font-medium mt-1 bg-indigo-50/50 px-2.5 py-1 rounded-full border border-indigo-100/50">
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
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
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
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
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
                    <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
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
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row justify-between items-center py-4 lg:h-20 gap-4">
                  {/* Seminar Logo & Identity */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-100">
                      <GraduationCap className="w-6 h-6" />
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

                      <div className="flex gap-1.5 justify-start lg:justify-end">
                        {/* Database URL Config Button */}
                        <button
                          onClick={() => setShowDbConfigModal(true)}
                          className="text-[10px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium px-2.5 py-1 rounded border border-slate-200 transition-all shadow-sm cursor-pointer"
                        >
                          <Cloud className="w-3 h-3 inline ml-1 text-slate-500" /> הגדרות חיבור ענן ☁️
                        </button>

                        {/* Password helper for Director only */}
                        {role === "director" && (
                          <button
                            onClick={() => setShowPasswordsHelperModal(true)}
                            className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium px-2.5 py-1 rounded border border-indigo-100 transition-all shadow-sm cursor-pointer"
                          >
                            <Key className="w-3 h-3 inline ml-1 text-indigo-500" /> ניהול סיסמאות רכזות 🔑
                          </button>
                        )}
                      </div>

                      {/* Sub-selector for Track when Coordinator is active */}
                      {role === "coordinator" && activeTrack && (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded border border-slate-200 text-[11px] text-slate-700">
                          <span className="font-medium px-1 text-slate-500">בחרי מסלול רכזת:</span>
                          <select
                            value={activeTrack}
                            onChange={(e) => {
                              setActiveTrack(e.target.value);
                              setFilterTrack(e.target.value);
                            }}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-semibold text-slate-800 focus:outline-none text-[11px]"
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
            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
              {/* Connection Status Banner */}
              <div
                className={`mb-6 p-4 rounded-xl border text-xs flex justify-between items-center transition-all ${
                  dbMode === "cloud"
                    ? "bg-emerald-50/50 text-emerald-850 border-emerald-200"
                    : "bg-amber-50/50 text-amber-950 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cloud className={`w-4 h-4 ${dbMode === "cloud" ? "text-emerald-600 animate-pulse" : "text-amber-600"}`} />
                  <span>
                    {dbMode === "cloud" ? (
                      <span>
                        המערכת מחוברת בהצלחה ל-<strong>PostgreSQL / Supabase</strong> ומסנכרנת כל פעולה בזמן אמת!
                      </span>
                    ) : (
                      <span>
                        המערכת עובדת כרגע ב-<strong>מצב מקומי (LocalStorage)</strong>. המידע נשמר על מחשב זה בלבד.
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    dbMode === "cloud"
                      ? "bg-white text-emerald-700 border-emerald-100"
                      : "bg-white text-amber-700 border-amber-100"
                  }`}
                >
                  {dbMode === "cloud" ? "מצב ענן פעיל ☁️" : "מצב מקומי 💻"}
                </span>
              </div>

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
                      <span className="text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded text-[10px] border border-indigo-100/50">
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
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Filters fields */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* Search Field */}
                    <div className="relative min-w-[180px] flex-grow sm:flex-none">
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="חיפוש מורה, מקצוע, ת.ז..."
                        className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all text-slate-700 h-9"
                      />
                    </div>

                    {/* Track filter */}
                    <div className="min-w-[130px] flex-grow sm:flex-none">
                      <select
                        value={filterTrack}
                        disabled={role === "coordinator"}
                        onChange={(e) => setFilterTrack(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-semibold bg-white cursor-pointer text-slate-700 h-9 ${
                          role === "coordinator" ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <option value="all">כל ההתמחויות</option>
                        {ALL_TRACKS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Job type filter */}
                    <div className="min-w-[130px] flex-grow sm:flex-none">
                      <select
                        value={filterJobType}
                        onChange={(e) => setFilterJobType(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-semibold bg-white cursor-pointer text-slate-700 h-9"
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
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all text-slate-700 bg-white cursor-pointer font-semibold h-9"
                      >
                        <option value="all">כל השנים</option>
                        <option value="יג">שנה יג</option>
                        <option value="יד">שנה יד</option>
                        <option value="יג+יד">שנה יג+יד</option>
                      </select>
                    </div>

                    {/* Status filter */}
                    <div className="min-w-[120px] flex-grow sm:flex-none">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all text-slate-700 bg-white cursor-pointer h-9"
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
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-1.5 rounded-lg text-xs shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center h-9"
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

                {/* Coordinator notice banner */}
                {role === "coordinator" && activeTrack && (
                  <div className="mt-4 p-3 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-sm flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                      <span>
                        שלום <strong>רכזת התמחות {activeTrack}</strong>. המערכת מציגה ומאפשרת לך לדווח
                        רק עבור המקצועות והמורים השייכים להתמחות שלך.
                      </span>
                    </div>
                    <div className="text-xs font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>הטבלה שלך נשמרת ישירות לענן</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Spreadsheet container */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-2 no-print">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
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

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[2000px]">
                    <thead>
                      <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 text-xs font-bold tracking-wider">
                        <th className="p-3.5 text-center w-52 bg-slate-200/50 text-slate-900 font-extrabold">
                          סטטוס וחוזים
                        </th>
                        <th className="p-3.5 w-32 text-right">התמחות</th>
                        <th className="p-3.5 w-24 text-center">שנה</th>
                        <th className="p-3.5 w-56 text-right">שם המורה</th>
                        <th className="p-3.5 w-56 text-right">שם המקצוע</th>
                        <th className="p-3.5 w-48 text-right">סמסטר / מחזור</th>
                        <th className="p-3.5 w-44 text-center">צורת תשלום</th>
                        <th className="p-3.5 text-center w-20">ש"ש</th>
                        <th className="p-3.5 text-center w-28">חודשים / מפגשים</th>
                        <th className="p-3.5 text-center w-32 bg-amber-50/20 text-amber-900 font-bold">
                          שעות שנתיות
                        </th>
                        <th className="p-3.5 text-center w-24">תעריף לשעה</th>
                        <th className="p-3.5 text-center w-28 bg-indigo-50/30">
                          עלות מעביד לשעה
                        </th>
                        <th className="p-3.5 text-center w-32 bg-indigo-50/50 text-indigo-900 font-extrabold">
                          סה"כ שנתי
                        </th>
                        <th className="p-3.5 text-center w-32">ת.ז מורה</th>
                        <th className="p-3.5 text-center w-36">טלפון מורה *</th>
                        <th className="p-3.5 text-center w-48">אימייל מורה *</th>
                        <th className="p-3.5 text-center w-28 bg-slate-100/50">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={17} className="text-center py-12 text-slate-400 font-bold">
                            لا נמצאו משרות העונות על פילוח הסינון הנוכחי.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((item) => {
                          const isEditing = activeEditingId === item.id;
                          const jobCount = records.filter(
                            (r) =>
                              r.teacherName &&
                              r.teacherName.trim().toLowerCase() ===
                                item.teacherName.trim().toLowerCase()
                          ).length;

                          const multipleJobsBadge =
                            jobCount > 1 ? (
                              <span
                                className="text-indigo-600 font-black text-sm mr-1 select-none"
                                title={`מורה זו מלמדת ${jobCount} משרות/מקצועות בסמינר`}
                              >
                                *
                              </span>
                            ) : null;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                item.isContractReady
                                  ? "bg-violet-50/45 hover:bg-violet-50/70"
                                  : item.isApproved
                                  ? "bg-emerald-50/10 hover:bg-emerald-50/20"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              {/* 1. STATUS & CONTRACT column */}
                              <td className="p-3 align-middle border-b border-slate-100 text-center bg-slate-50/30">
                                <div className="flex flex-col items-center justify-center gap-1.5">
                                  {role === "director" ? (
                                    item.id > 0 ? (
                                      item.isApproved ? (
                                        <button
                                          onClick={() => handleToggleApproved(item.id, false)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition w-36 text-center flex items-center justify-center gap-1"
                                        >
                                          <UserCheck className="w-3.5 h-3.5" /> מאושר
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleApproved(item.id, true)}
                                          className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition w-36 text-center flex items-center justify-center gap-1"
                                        >
                                          <UserX className="w-3.5 h-3.5" /> אשר כעת
                                        </button>
                                      )
                                    ) : (
                                      <button className="bg-slate-200 text-slate-500 font-bold text-[11px] px-3 py-1.5 rounded-lg border border-slate-300 w-36 text-center cursor-not-allowed">
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
                                        className={`font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition w-36 text-center flex items-center justify-center gap-1 ${
                                          item.isContractReady
                                            ? "bg-violet-600 hover:bg-violet-700 text-white"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                        }`}
                                      >
                                        <FileSignature className="w-3.5 h-3.5" />
                                        {item.isContractReady ? "הוכן חוזה 📜" : "הכיני חוזה 📜"}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400 font-bold">
                                        ממתין לאישור מנהלת
                                      </span>
                                    )
                                  ) : (
                                    /* Coordinator or guest status label */
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
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

                              {/* Editable or View-Only Fields */}
                              {isEditing ? (
                                <>
                                  {/* TRACK */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <select
                                      value={editTrack}
                                      onChange={(e) => setEditTrack(e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white font-semibold"
                                    >
                                      {ALL_TRACKS.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  {/* YEAR */}
                                  <td className="p-2 border-b border-slate-100 text-center align-middle">
                                    <select
                                      value={editYear}
                                      onChange={(e) => setEditYear(e.target.value)}
                                      className="text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white"
                                    >
                                      <option value="יג">יג</option>
                                      <option value="יד">יד</option>
                                      <option value="יג+יד">יג+יד</option>
                                    </select>
                                  </td>
                                  {/* TEACHER NAME */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <input
                                      type="text"
                                      value={editTeacherName}
                                      onChange={(e) => setEditTeacherName(e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                                    />
                                  </td>
                                  {/* SUBJECT */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <input
                                      type="text"
                                      value={editSubject}
                                      onChange={(e) => setEditSubject(e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                                    />
                                  </td>
                                  {/* SEMESTER */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <select
                                      value={editSemester}
                                      onChange={(e) => setEditSemester(e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white"
                                    >
                                      <option value="שנתי">שנתי</option>
                                      <option value="מקצוע בסמסטר א'">מקצוע בסמסטר א'</option>
                                      <option value="מקצוע בסמסטר ב'">מקצוע בסמסטר ב'</option>
                                      <option value="קורס בסמסטר א'">קורס בסמסטר א'</option>
                                      <option value="קורס בסמסטר ב'">קורס בסמסטר ב'</option>
                                    </select>
                                  </td>
                                  {/* PAYMENT METHOD */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <select
                                      value={editPaymentMethod}
                                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white font-semibold"
                                    >
                                      <option value="תקן">תקן (+45%)</option>
                                      <option value="שכר מרצים">שכר מרצים (+30%)</option>
                                      <option value="קבלה">קבלה (+18%)</option>
                                      <option value="קבלת פטור">קבלת פטור (0%)</option>
                                    </select>
                                  </td>
                                  {/* SHASH */}
                                  <td className="p-2 border-b border-slate-100 text-center align-middle">
                                    <input
                                      type="number"
                                      value={editShash || ""}
                                      onChange={(e) => setEditShash(parseFloat(e.target.value) || 0)}
                                      className="w-14 text-center text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white"
                                    />
                                  </td>
                                  {/* MEETINGS */}
                                  <td className="p-2 border-b border-slate-100 text-center align-middle">
                                    <input
                                      type="number"
                                      value={editMeetings || ""}
                                      onChange={(e) => setEditMeetings(parseInt(e.target.value, 10) || 0)}
                                      className="w-16 text-center text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white"
                                    />
                                  </td>
                                  {/* TOTAL HOURS (CALCULATED LIVE) */}
                                  <td className="p-3 border-b border-slate-100 text-center font-bold text-slate-800 bg-amber-50/5 align-middle">
                                    {activeCalculatedVals.totalHours}
                                  </td>
                                  {/* RATE */}
                                  <td className="p-2 border-b border-slate-100 text-center align-middle">
                                    <input
                                      type="number"
                                      value={editRate || ""}
                                      onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                                      className="w-18 text-center text-xs border border-slate-200 rounded p-1 focus:outline-none bg-white"
                                    />
                                  </td>
                                  {/* EMPLOYER OVERHEAD (CALCULATED LIVE) */}
                                  <td className="p-3 border-b border-slate-100 text-center font-bold text-slate-800 bg-indigo-50/10 align-middle text-indigo-900">
                                    ₪{activeCalculatedVals.employerOverhead.toLocaleString()}
                                  </td>
                                  {/* TOTAL ANNUAL (CALCULATED LIVE) */}
                                  <td className="p-3 border-b border-slate-100 text-center font-extrabold text-indigo-900 bg-indigo-50/20 align-middle">
                                    ₪{activeCalculatedVals.totalAnnual.toLocaleString()}
                                  </td>
                                  {/* TZ */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <input
                                      type="text"
                                      value={editTz}
                                      onChange={(e) => setEditTz(e.target.value)}
                                      className="w-full text-center text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                                    />
                                  </td>
                                  {/* PHONE */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <input
                                      type="text"
                                      value={editPhone}
                                      onChange={(e) => setEditPhone(e.target.value)}
                                      className="w-full text-center text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                                    />
                                  </td>
                                  {/* EMAIL */}
                                  <td className="p-2 border-b border-slate-100 align-middle">
                                    <input
                                      type="text"
                                      value={editEmail}
                                      onChange={(e) => setEditEmail(e.target.value)}
                                      className="w-full text-center text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white font-mono"
                                    />
                                  </td>
                                  {/* INLINE EDIT ACTIONS */}
                                  <td className="p-2 border-b border-slate-100 text-center align-middle bg-slate-50/30">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleSaveRow(item.id)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1 rounded transition cursor-pointer"
                                      >
                                        שמירה
                                      </button>
                                      <button
                                        onClick={() => handleCancelEdit(item.id)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-[10px] px-2.5 py-1 rounded transition cursor-pointer"
                                      >
                                        ביטול
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-3.5 border-b border-slate-100 font-semibold text-slate-700 align-middle">
                                    {item.track}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center text-slate-500 font-medium align-middle">
                                    {item.year}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 font-bold text-slate-900 max-w-[220px] truncate align-middle">
                                    {item.teacherName || "—"}
                                    {multipleJobsBadge}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 font-medium text-slate-800 max-w-[220px] truncate align-middle">
                                    {item.subject || "—"}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-slate-600 align-middle">
                                    {item.semester || "שנתי"}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center align-middle">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                                        item.paymentMethod === "תקן"
                                          ? "bg-indigo-50 text-indigo-800 border border-indigo-100"
                                          : item.paymentMethod === "שכר מרצים"
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                          : item.paymentMethod === "קבלה"
                                          ? "bg-amber-50 text-amber-800 border border-amber-100"
                                          : "bg-blue-50 text-blue-800 border border-blue-100"
                                      }`}
                                    >
                                      {item.paymentMethod}
                                      {item.paymentMethod === "תקן"
                                        ? " (+45%)"
                                        : item.paymentMethod === "שכר מרצים"
                                        ? " (+30%)"
                                        : item.paymentMethod === "קבלה"
                                        ? " (+18%)"
                                        : " (0%)"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-medium align-middle">
                                    {item.shash}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-medium align-middle">
                                    {item.meetings}{" "}
                                    <span className="text-[10px] text-slate-400 block">
                                      {item.paymentMethod === "תקן" ? "חודשים" : "מפגשים"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-extrabold text-slate-800 bg-amber-50/20 align-middle">
                                    {item.totalHours}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-semibold align-middle">
                                    ₪{item.rate}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-extrabold text-slate-900 bg-indigo-50/30 align-middle">
                                    ₪{item.employerOverhead.toLocaleString()}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-black text-indigo-700 bg-indigo-50/50 align-middle">
                                    ₪{item.totalAnnual.toLocaleString()}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center font-mono align-middle">
                                    {item.tz || "—"}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center align-middle">
                                    {item.phone || "—"}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 max-w-[180px] truncate align-middle">
                                    {item.email || "—"}
                                  </td>
                                  <td className="p-3.5 border-b border-slate-100 text-center align-middle bg-slate-50/30">
                                    <div className="flex items-center justify-center gap-1">
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
                                    </div>
                                  </td>
                                </>
                              )}
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
                      <span className="text-indigo-600 font-bold">סך תקציב שכר מחושב בטבלה:</span>
                      <strong className="text-indigo-700 text-lg font-black mr-1">
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
                {/* Cumulative track budget split charts */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
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
                            <span className="text-indigo-950 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-bold text-[10px]">
                              ₪{amount.toLocaleString()} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {role === "director" && (
                    <div className="mt-6 pt-4 border-t border-slate-150 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                      <span>* כולל תקורות ועלויות מעביד מלאות</span>
                      <button
                        onClick={handleClearAllData}
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        איפוס וניקוי מוחלט
                      </button>
                    </div>
                  )}
                </div>

                {/* Overhead formula reference guide */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-semibold text-slate-800 text-sm">
                        מפת תקורות ונוסחאות שכר מותאמות
                      </h3>
                    </div>
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                      חישובים מבוקרי סמינר
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tenure Formula */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/50">
                      <h4 className="font-semibold text-xs text-indigo-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        משרת תקן (חודשי)
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 font-normal">
                        עלות המעביד כוללת תוספת של <strong>45%</strong>. שעות התלמידות מוכפלות ב-30
                        (משקף את השעות השנתיות), בעוד שכר המורה מחושב ישירות מתעריף השעה החודשית.
                      </p>
                      <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-100/50 text-[10px] font-mono text-indigo-950 leading-relaxed">
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
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* 1. PASSWORD ACCESS MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center relative overflow-hidden">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4 border border-indigo-100">
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
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 mb-2 h-10"
            />
            {passwordError && (
              <p className="text-red-500 text-xs font-bold mb-4">{passwordError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={submitPassword}
                className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
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

      {/* 3. CLOUD DATABASE CONFIGURATION MODAL */}
      {showDbConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative">
            <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 text-center">
              הגדרת חיבור למסד נתונים בענן
            </h3>
            <p className="text-xs text-slate-455 text-center mb-4 leading-relaxed font-normal">
              הזיני כאן את מחרוזת החיבור (Connection String) של Supabase / PostgreSQL על מנת לסנכרן
              את נתוני השכר והתקציב של הסמינר לענן בזמן אמת.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  מחרוזת חיבור PostgreSQL (DATABASE_URL):
                </label>
                <input
                  type="text"
                  value={customDbUrl}
                  onChange={(e) => setCustomDbUrl(e.target.value)}
                  placeholder="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 font-mono h-9"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSaveDbUrl}
                className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                שמירת חיבור
              </button>
              <button
                onClick={handleClearDbUrl}
                className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 font-medium py-1.5 px-4 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
                title="נתק חיבור ענן ועבור למצב מקומי"
              >
                ביטול חיבור ענן
              </button>
              <button
                onClick={() => setShowDbConfigModal(false)}
                className="flex-grow bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
              >
                סגירה
              </button>
            </div>
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
                    className="border border-slate-200 rounded px-2 py-1 text-xs w-40 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSaveCoordinatorPasswords}
                className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 rounded-lg text-xs transition cursor-pointer h-9 shadow-sm"
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
                <FileSignature className="w-5 h-5 text-violet-600" />
                <span>
                  הסכם העסקה מאוחד -{" "}
                  <span className="text-violet-700 font-bold">
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-4 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 h-9 shadow-sm"
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition h-9"
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
                    <th className="border border-slate-200 p-2 text-right">סמסטר / מחזור</th>
                    <th className="border border-slate-200 p-2 text-center">צורת תשלום</th>
                    <th className="border border-slate-200 p-2 text-center">ש"ש</th>
                    <th className="border border-slate-200 p-2 text-center">מפגשים/חודשים</th>
                    <th className="border border-slate-200 p-2 text-center bg-amber-500/10 text-amber-950 font-semibold">
                      שעות שנתיות
                    </th>
                    <th className="border border-slate-200 p-2 text-center">תעריף שעה</th>
                    <th className="border border-slate-200 p-2 text-center bg-indigo-50/50 text-indigo-950">
                      עלות מעביד לשעה
                    </th>
                    <th className="border border-slate-200 p-2 text-center bg-indigo-600 text-white font-semibold">
                      סה"כ שנתי שכר
                    </th>
                    <th className="border border-slate-200 p-2 text-center">סטטוס אישור</th>
                    <th className="border border-slate-200 p-2 text-center">סטטוס חוזה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 text-slate-800 transition-colors">
                      <td className="border border-slate-200 p-2 font-medium">{item.track}</td>
                      <td className="border border-slate-200 p-2 text-center">{item.year}</td>
                      <td className="border border-slate-200 p-2 font-bold max-w-[200px] truncate">
                        {item.teacherName}
                      </td>
                      <td className="border border-slate-200 p-2 max-w-[200px] truncate text-slate-600">
                        {item.subject}
                      </td>
                      <td className="border border-slate-200 p-2 text-right text-slate-500">
                        {item.semester}
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
                      <td className="border border-slate-200 p-2 text-center bg-indigo-50/10 font-medium text-indigo-900">
                        ₪{item.employerOverhead.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-center bg-indigo-50 font-bold text-indigo-950">
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
                      <td
                        className={`border border-slate-200 p-2 text-center font-medium text-[10px] ${
                          item.isContractReady
                            ? "text-violet-700 bg-violet-50/50"
                            : "text-slate-500 bg-slate-50/50"
                        }`}
                      >
                        {item.isContractReady ? "הוכן חוזה 📜" : "הכיני חוזה 📜"}
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
                    <td className="border border-slate-200 p-3 text-center bg-indigo-100/50 text-indigo-950 font-bold text-sm">
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
                  : "bg-indigo-50 text-indigo-600 border-indigo-100"
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-xs transition cursor-pointer shadow-sm h-9"
            >
              הבנתי, תודה
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
    </div>
  );
}
