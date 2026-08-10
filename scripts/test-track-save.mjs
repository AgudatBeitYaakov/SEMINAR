const tracks = [
  "קודש",
  "חובה",
  'חנ"מ והו"מ',
  "גננות",
  "אדריכלות",
  "גרפיקה",
  "מיסים וחשבונאות",
];

const baseUrl = process.argv[2] || "http://localhost:3001";

for (const track of tracks) {
  const body = {
    id: 0,
    track,
    year: "יג",
    teacherName: "בדיקת מערכת",
    subject: `test-${track}`,
    semester: "שנתי",
    paymentMethod: "שכר מרצים",
    shash: 1,
    meetings: 1,
    totalHours: 1,
    rate: 100,
    employerOverhead: 130,
    totalAnnual: 130,
    tz: "",
    phone: "050-0000000",
    email: "test@sz.org",
    isApproved: false,
    isContractReady: false,
    travel: "בית שמש",
    gradeTiming: "ציון אחד בסוף שנה",
    monthlyHours: {},
  };

  const res = await fetch(`${baseUrl}/api/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(
    track,
    res.status,
    data.success ? `OK id=${data.record?.id}` : `FAIL ${data.error}`
  );
}

const stats = await fetch(`${baseUrl}/api/records/stats`).then((r) => r.json());
console.log("\nStats:", JSON.stringify(stats.counts, null, 2));
