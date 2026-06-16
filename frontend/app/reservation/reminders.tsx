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
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/src/api/client";
import { colors } from "@/src/theme";
import { formatDateID, formatRp } from "@/src/utils/format";
import { reservationStatusLabel, formatWhatsAppLink } from "@/src/utils/reservation";

export default function RemindersScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const preview = await api.getRemindersPreview();
      setData(preview);
    } catch (e) {
      console.warn("load reminders", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sendToAdmin = () => {
    if (!data?.admin_whatsapp) {
      Alert.alert("Error", "Nomor WhatsApp admin belum diatur. Silakan atur di Profil Bisnis.");
      return;
    }

    // Build reminder message
    let message = "🔔 *REMINDER H-2 KEBERANGKATAN*\n\n";
    message += `Ada ${data.reminders.length} reservasi yang perlu diperhatikan:\n\n`;

    data.reminders.forEach((r: any, idx: number) => {
      message += `${idx + 1}. ${r.departure_date}\n`;
      message += `   👤 ${r.client_name}\n`;
      message += `   🚌 ${r.bus_name}\n`;
      message += `   💰 Sisa: ${formatRp(r.remaining)}\n`;
      if (!r.pickup_complete) {
        message += `   ⚠️ Detail pickup belum lengkap\n`;
      }
      message += "\n";
    });

    message += "Mohon pastikan pembayaran lunas dan detail pickup lengkap.";

    const url = formatWhatsAppLink(data.admin_whatsapp, message);
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Tidak dapat membuka WhatsApp");
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const reminders = data?.reminders || [];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminder H-2</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Feather name="bell" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Pengingat Otomatis</Text>
            <Text style={styles.infoDesc}>
              Reservasi di bawah ini akan berangkat dalam 2 hari dan memerlukan perhatian Anda.
            </Text>
          </View>
        </View>

        {/* Admin Contact Info */}
        <View style={styles.adminCard}>
          <Text style={styles.adminLabel}>Kirim ke Admin:</Text>
          <View style={styles.adminRow}>
            <View style={styles.adminItem}>
              <Feather name="message-circle" size={16} color={colors.whatsapp} />
              <Text style={styles.adminText}>
                {data?.admin_whatsapp || "Belum diatur"}
              </Text>
            </View>
            <View style={styles.adminItem}>
              <Feather name="mail" size={16} color={colors.primary} />
              <Text style={styles.adminText}>
                {data?.admin_email || "Belum diatur"}
              </Text>
            </View>
          </View>
          {(!data?.admin_whatsapp || !data?.admin_email) && (
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.setupBtnText}>Atur di Profil Bisnis</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Send Button */}
        {reminders.length > 0 && data?.admin_whatsapp && (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={sendToAdmin}
            activeOpacity={0.85}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
            <Text style={styles.sendBtnText}>Kirim Reminder ke WhatsApp Admin</Text>
          </TouchableOpacity>
        )}

        {/* Reminders List */}
        {reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color={colors.status.paid.text} />
            <Text style={styles.emptyTitle}>Tidak ada reminder</Text>
            <Text style={styles.emptyDesc}>
              Semua reservasi dalam 2 hari ke depan sudah aman.
            </Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>{reminders.length} Reservasi Perlu Perhatian</Text>
            {reminders.map((r: any) => (
              <TouchableOpacity
                key={r.id}
                style={styles.reminderCard}
                onPress={() => router.push(`/reservation/${r.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.reminderHeader}>
                  <View style={styles.dateBox}>
                    <Feather name="calendar" size={14} color={colors.primary} />
                    <Text style={styles.dateText}>{formatDateID(r.departure_date)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.status[r.status]?.bg || colors.status.booked.bg }]}>
                    <Text style={[styles.statusText, { color: colors.status[r.status]?.text || colors.status.booked.text }]}>
                      {reservationStatusLabel(r.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.clientName}>{r.client_name}</Text>
                <Text style={styles.busName}>{r.bus_name}</Text>

                <View style={styles.reminderMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Total</Text>
                    <Text style={styles.metaValue}>{formatRp(r.total_price)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Sisa Bayar</Text>
                    <Text style={[styles.metaValue, { color: colors.status.overdue.text }]}>
                      {formatRp(r.remaining)}
                    </Text>
                  </View>
                </View>

                {!r.pickup_complete && (
                  <View style={styles.warningBadge}>
                    <Feather name="alert-triangle" size={14} color="#B45309" />
                    <Text style={styles.warningText}>Detail pickup belum lengkap</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  infoCard: {
    flexDirection: "row",
    backgroundColor: colors.status.booked.bg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  infoTitle: { fontSize: 16, fontWeight: "700", color: colors.primary },
  infoDesc: { fontSize: 13, color: colors.primary, marginTop: 4, lineHeight: 18 },
  adminCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  adminLabel: { fontSize: 12, fontWeight: "600", color: colors.textMute, marginBottom: 12 },
  adminRow: { flexDirection: "row", gap: 16 },
  adminItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminText: { fontSize: 13, color: colors.text },
  setupBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
  },
  setupBtnText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.whatsapp,
    height: 50,
    borderRadius: 14,
    marginBottom: 24,
  },
  sendBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyDesc: { fontSize: 14, color: colors.textMute, textAlign: "center" },
  listSection: {},
  listTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 16 },
  reminderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  clientName: { fontSize: 16, fontWeight: "700", color: colors.text },
  busName: { fontSize: 14, color: colors.textMid, marginTop: 2 },
  reminderMeta: { flexDirection: "row", gap: 24, marginTop: 12 },
  metaItem: {},
  metaLabel: { fontSize: 11, color: colors.textMute },
  metaValue: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  warningText: { fontSize: 12, color: "#B45309", fontWeight: "500" },
});
