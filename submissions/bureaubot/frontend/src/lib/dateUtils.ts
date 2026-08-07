export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  try {
    let str = String(dateInput).trim();
    // Append Z to naive ISO timestamps so browser parses as UTC
    if (typeof dateInput === "string" && str.includes("T") && !str.endsWith("Z") && !str.includes("+")) {
      // Check if no timezone offset suffix
      const timePart = str.split("T")[1] || "";
      if (!timePart.includes("-") && !timePart.includes("+")) {
        str += "Z";
      }
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return String(dateInput);

    const time12h = d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const hours24 = String(d.getHours()).padStart(2, "0");
    const mins24 = String(d.getMinutes()).padStart(2, "0");

    return `${time12h} (${hours24}:${mins24})`;
  } catch {
    return String(dateInput);
  }
}

