console.log("Keys in process.env:");
Object.keys(process.env).forEach(key => {
  if (key.includes("DATABASE") || key.includes("SUPABASE") || key.includes("URL") || key.includes("KEY")) {
    const val = process.env[key];
    const masked = val ? (val.length > 10 ? val.substring(0, 5) + "..." + val.substring(val.length - 5) : "***") : "empty";
    console.log(`- ${key}: ${masked}`);
  }
});
