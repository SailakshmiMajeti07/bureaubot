export function downloadIcsFile(title: string, description: string, scheduledForDate: string) {
  try {
    const startDate = new Date(scheduledForDate);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 mins duration

    const formatDateUtc = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d{3}/g, "");

    const startUtc = formatDateUtc(startDate);
    const endUtc = formatDateUtc(endDate);

    const csContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BureauBot//Application Reminder//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `SUMMARY:${title.replace(/\n/g, " ")}`,
      `DESCRIPTION:${description.replace(/\n/g, " ")} - Set via BureauBot Gateway`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([csContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bureaubot_reminder_${Date.now()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to generate ICS file", err);
  }
}

export function getGoogleCalendarUrl(title: string, description: string, scheduledForDate: string): string {
  try {
    const startDate = new Date(scheduledForDate);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const formatDateUtc = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d{3}/g, "");

    const startUtc = formatDateUtc(startDate);
    const endUtc = formatDateUtc(endDate);

    const baseUrl = "https://calendar.google.com/calendar/render";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      details: `${description} - BureauBot Indian Resident Gateway`,
      dates: `${startUtc}/${endUtc}`,
    });

    return `${baseUrl}?${params.toString()}`;
  } catch {
    return "https://calendar.google.com";
  }
}
