export const colors = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  primary: "#1E40AF",
  primaryHover: "#1E3A8A",
  primaryLight: "#3B82F6",
  accent: "#0EA5E9",
  whatsapp: "#25D366",
  text: "#0F172A",
  textMid: "#475569",
  textMute: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  status: {
    draft: { bg: "#F1F5F9", text: "#475569" },
    sent: { bg: "#EFF6FF", text: "#1D4ED8" },
    paid: { bg: "#F0FDF4", text: "#15803D" },
    overdue: { bg: "#FEF2F2", text: "#B91C1C" },
    // Reservation statuses
    booked: { bg: "#EFF6FF", text: "#1D4ED8" },
    downpayment: { bg: "#FEF3C7", text: "#B45309" },
    cancel: { bg: "#FEF2F2", text: "#B91C1C" },
  } as Record<string, { bg: string; text: string }>,
};
