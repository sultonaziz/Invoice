// Reservation utility functions

export const RESERVATION_STATUSES = [
  { key: "all", label: "Semua" },
  { key: "booked", label: "Booking" },
  { key: "downpayment", label: "DP" },
  { key: "paid", label: "Lunas" },
  { key: "cancel", label: "Batal" },
];

export function reservationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    booked: "Booking",
    downpayment: "DP",
    paid: "Lunas",
    cancel: "Batal",
  };
  return labels[status] || status;
}

export function formatPhone(phone: string): string {
  if (!phone) return "-";
  // Format Indonesian phone for WhatsApp
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

export function formatWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = formatPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function buildReservationMessage(reservation: any): string {
  const client = reservation.client_snapshot?.name || "Pelanggan";
  const bus = reservation.bus_snapshot?.name || "Bus";
  const plate = reservation.bus_snapshot?.plate_number || "";
  const driver = reservation.driver_snapshot?.name || "-";
  const pickup = reservation.pickup || {};
  
  let msg = `*Detail Reservasi - Luar Jendela Creatrip*\n\n`;
  msg += `Yth. ${client},\n\n`;
  msg += `Berikut detail reservasi Anda:\n\n`;
  msg += `🚌 *Armada:* ${bus}${plate ? ` (${plate})` : ""}\n`;
  msg += `👤 *Driver:* ${driver}\n`;
  msg += `📅 *Keberangkatan:* ${reservation.departure_date || "-"}\n`;
  if (reservation.return_date) {
    msg += `📅 *Kembali:* ${reservation.return_date}\n`;
  }
  msg += `📍 *Tujuan:* ${reservation.destination || "-"}\n\n`;
  
  msg += `*Detail Penjemputan:*\n`;
  msg += `• PIC: ${pickup.pic_name || "-"}\n`;
  msg += `• Telepon: ${pickup.pic_phone || "-"}\n`;
  msg += `• Alamat: ${pickup.address || "-"}\n`;
  msg += `• Waktu Standby: ${pickup.standby_time || "-"}\n`;
  msg += `• Jumlah Kursi: ${pickup.seat_capacity || "-"}\n\n`;
  
  msg += `💰 *Total:* Rp ${(reservation.total_price || 0).toLocaleString("id-ID")}\n`;
  if (reservation.downpayment > 0) {
    msg += `💵 *DP:* Rp ${reservation.downpayment.toLocaleString("id-ID")}\n`;
    msg += `📝 *Sisa:* Rp ${(reservation.total_price - reservation.downpayment).toLocaleString("id-ID")}\n`;
  }
  
  msg += `\nTerima kasih telah mempercayakan perjalanan Anda kepada kami! 🙏`;
  
  return msg;
}
