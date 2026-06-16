import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/src/api/client";
import { colors } from "@/src/theme";
import { formatDateID, formatRp } from "@/src/utils/format";
import {
  reservationStatusLabel,
  formatWhatsAppLink,
  buildReservationMessage,
} from "@/src/utils/reservation";

export default function ReservationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getReservation(id);
      setReservation(data);
    } catch (e) {
      console.warn("load reservation", e);
      Alert.alert("Error", "Gagal memuat data reservasi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.setReservationStatus(id, newStatus);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Gagal mengubah status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!reservation) return;
    const phone = reservation.client_snapshot?.phone || reservation.pickup?.pic_phone;
    if (!phone) {
      Alert.alert("Error", "Nomor telepon tidak tersedia");
      return;
    }
    const message = buildReservationMessage(reservation);
    const url = formatWhatsAppLink(phone, message);
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Error", "Tidak dapat membuka WhatsApp");
    }
  };

  const handleToInvoice = async () => {
    if (!id) return;
    Alert.alert(
      "Generate Invoice",
      "Buat invoice dari reservasi ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Buat Invoice",
          onPress: async () => {
            setActionLoading(true);
            try {
              const result = await api.reservationToInvoice(id);
              Alert.alert("Sukses", result.message, [
                {
                  text: "Lihat Invoice",
                  onPress: () => router.push(`/invoice/${result.invoice.id}`),
                },
                { text: "OK" },
              ]);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Gagal membuat invoice");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Hapus Reservasi",
      "Yakin ingin menghapus reservasi ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.deleteReservation(id);
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Gagal menghapus");
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Reservasi tidak ditemukan</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = colors.status[reservation.status] || colors.status.booked;
  const clientName = reservation.client_snapshot?.name || "Tanpa klien";
  const busName = reservation.bus_snapshot?.name || "-";
  const driverName = reservation.driver_snapshot?.name || "-";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Reservasi</Text>
        <TouchableOpacity
          onPress={() => router.push(`/reservation/edit/${id}`)}
          style={styles.editBtn}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor.bg }]}>
          <View style={styles.statusBannerLeft}>
            <Text style={[styles.statusLabel, { color: statusColor.text }]}>Status</Text>
            <Text style={[styles.statusValue, { color: statusColor.text }]}>
              {reservationStatusLabel(reservation.status)}
            </Text>
          </View>
          {actionLoading && <ActivityIndicator color={statusColor.text} />}
        </View>

        {/* Client & Pricing */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Klien</Text>
            <Text style={styles.cardValue}>{clientName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Total Harga</Text>
            <Text style={styles.cardValueBold}>{formatRp(reservation.total_price)}</Text>
          </View>
          {reservation.downpayment > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>DP Dibayar</Text>
                <Text style={styles.cardValue}>{formatRp(reservation.downpayment)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Sisa</Text>
                <Text style={[styles.cardValue, { color: colors.status.overdue.text }]}>
                  {formatRp(reservation.total_price - reservation.downpayment)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detail Perjalanan</Text>
          <View style={styles.cardRow}>
            <Feather name="calendar" size={16} color={colors.textMute} />
            <Text style={styles.cardRowText}>
              {formatDateID(reservation.departure_date)}
              {reservation.return_date ? ` - ${formatDateID(reservation.return_date)}` : ""}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Feather name="map-pin" size={16} color={colors.textMute} />
            <Text style={styles.cardRowText}>{reservation.destination || "-"}</Text>
          </View>
          <View style={styles.cardRow}>
            <Feather name="truck" size={16} color={colors.textMute} />
            <Text style={styles.cardRowText}>{busName}</Text>
          </View>
          <View style={styles.cardRow}>
            <Feather name="user" size={16} color={colors.textMute} />
            <Text style={styles.cardRowText}>{driverName}</Text>
          </View>
        </View>

        {/* Pickup Details */}
        {reservation.pickup && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Detail Penjemputan</Text>
            <View style={styles.pickupRow}>
              <Text style={styles.pickupLabel}>PIC</Text>
              <Text style={styles.pickupValue}>
                {reservation.pickup.pic_name || "-"}
                {reservation.pickup.pic_phone ? ` (${reservation.pickup.pic_phone})` : ""}
              </Text>
            </View>
            <View style={styles.pickupRow}>
              <Text style={styles.pickupLabel}>Alamat</Text>
              <Text style={styles.pickupValue}>{reservation.pickup.address || "-"}</Text>
            </View>
            <View style={styles.pickupRow}>
              <Text style={styles.pickupLabel}>Waktu Standby</Text>
              <Text style={styles.pickupValue}>{reservation.pickup.standby_time || "-"}</Text>
            </View>
            <View style={styles.pickupRow}>
              <Text style={styles.pickupLabel}>Jumlah Kursi</Text>
              <Text style={styles.pickupValue}>{reservation.pickup.seat_capacity || "-"}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {reservation.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Catatan</Text>
            <Text style={styles.notesText}>{reservation.notes}</Text>
          </View>
        )}

        {/* Status Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ubah Status</Text>
          <View style={styles.statusActions}>
            {["booked", "downpayment", "paid", "cancel"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusBtn,
                  reservation.status === s && styles.statusBtnActive,
                ]}
                onPress={() => handleStatusChange(s)}
                disabled={reservation.status === s || actionLoading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    reservation.status === s && styles.statusBtnTextActive,
                  ]}
                >
                  {s === "booked" ? "Booking" : s === "downpayment" ? "DP" : s === "paid" ? "Lunas" : "Batal"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnWhatsApp]}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Feather name="message-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          {reservation.status !== "cancel" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnInvoice]}
              onPress={handleToInvoice}
              activeOpacity={0.8}
              disabled={actionLoading}
            >
              <Feather name="file-text" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Buat Invoice</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
          disabled={actionLoading}
        >
          <Feather name="trash-2" size={18} color={colors.status.overdue.text} />
          <Text style={styles.deleteBtnText}>Hapus Reservasi</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 16, color: colors.textMute },
  backLink: { padding: 12 },
  backLinkText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.status.booked.bg,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusBannerLeft: {},
  statusLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  statusValue: { fontSize: 20, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
  cardLabel: { fontSize: 14, color: colors.textMid },
  cardValue: { fontSize: 14, color: colors.text, fontWeight: "500" },
  cardValueBold: { fontSize: 18, color: colors.text, fontWeight: "700" },
  cardRowText: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  pickupRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  pickupLabel: {
    width: 100,
    fontSize: 13,
    color: colors.textMute,
  },
  pickupValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  notesText: {
    fontSize: 14,
    color: colors.textMid,
    lineHeight: 20,
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMid,
  },
  statusBtnTextActive: {
    color: "#fff",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  actionBtnWhatsApp: {
    backgroundColor: colors.whatsapp,
  },
  actionBtnInvoice: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.status.overdue.text,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.status.overdue.text,
  },
});
