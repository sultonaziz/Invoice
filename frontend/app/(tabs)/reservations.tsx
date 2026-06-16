import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/src/api/client";
import { colors } from "@/src/theme";
import { formatDateID, formatRp } from "@/src/utils/format";
import {
  RESERVATION_STATUSES,
  reservationStatusLabel,
  formatWhatsAppLink,
  buildReservationMessage,
} from "@/src/utils/reservation";

export default function ReservationsScreen() {
  const router = useRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const [rsvData, reminderData] = await Promise.all([
        api.listReservations(),
        api.getReservationReminders(),
      ]);
      setReservations(rsvData);
      setReminders(reminderData);
    } catch (e) {
      console.warn("load reservations", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Sort: non-cancelled by departure date (soonest first), cancelled at bottom
  const filtered = useMemo(() => {
    let data = filter === "all"
      ? reservations
      : reservations.filter((r) => r.status === filter);
    
    // Sort logic: 
    // 1. Non-cancelled reservations first, sorted by departure_date (soonest first)
    // 2. Cancelled reservations at the bottom, sorted by created_at (newest first)
    return data.sort((a, b) => {
      // Cancelled reservations go to bottom
      if (a.status === "cancel" && b.status !== "cancel") return 1;
      if (a.status !== "cancel" && b.status === "cancel") return -1;
      
      // Both cancelled or both non-cancelled - sort by departure date
      const dateA = new Date(a.departure_date || a.created_at || 0).getTime();
      const dateB = new Date(b.departure_date || b.created_at || 0).getTime();
      return dateA - dateB; // Soonest departure first
    });
  }, [filter, reservations]);

  const totalBookings = useMemo(
    () => reservations.filter((r) => r.status !== "cancel").length,
    [reservations]
  );

  const totalRevenue = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "paid")
        .reduce((sum, r) => sum + (r.total_price || 0), 0),
    [reservations]
  );

  const sendWhatsApp = async (reservation: any) => {
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

  return (
    <SafeAreaView edges={["top"]} style={styles.root} testID="reservations-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>LUAR JENDELA CREATRIP</Text>
          <Text style={styles.title}>Reservasi</Text>
        </View>
        <TouchableOpacity
          testID="reservation-monthly-btn"
          style={styles.iconBtnGhost}
          onPress={() => router.push("/reservation/monthly")}
          activeOpacity={0.7}
        >
          <Feather name="bar-chart-2" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          testID="reservation-calendar-btn"
          style={styles.iconBtnGhost}
          onPress={() => router.push("/reservation/calendar")}
          activeOpacity={0.7}
        >
          <Feather name="calendar" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          testID="reservation-create-btn-header"
          style={styles.iconBtn}
          onPress={() => router.push("/reservation/new")}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Reminder Banner */}
      {reminders.length > 0 && (
        <TouchableOpacity
          style={styles.reminderBanner}
          onPress={() => router.push("/reservation/reminders")}
          activeOpacity={0.85}
        >
          <Feather name="alert-circle" size={20} color="#B45309" />
          <Text style={styles.reminderText}>
            {reminders.length} reservasi perlu perhatian (H-2)
          </Text>
          <Feather name="chevron-right" size={18} color="#B45309" />
        </TouchableOpacity>
      )}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Booking</Text>
          <Text style={styles.summaryAmount}>{totalBookings}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardAlt]}>
          <Text style={[styles.summaryLabel, { color: colors.textMute }]}>
            Pendapatan Lunas
          </Text>
          <Text style={[styles.summaryAmount, styles.summaryAmountAlt]}>
            {formatRp(totalRevenue)}
          </Text>
        </View>
      </View>

      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {RESERVATION_STATUSES.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                testID={`filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => router.push("/reservation/new")} />
      ) : (
        <FlatList
          testID="reservation-list"
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ReservationRow
              item={item}
              onPress={() => router.push(`/reservation/${item.id}`)}
              onWhatsApp={() => sendWhatsApp(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ReservationRow({
  item,
  onPress,
  onWhatsApp,
}: {
  item: any;
  onPress: () => void;
  onWhatsApp: () => void;
}) {
  const statusColor = colors.status[item.status] || colors.status.booked;
  const clientName = item.client_snapshot?.name || "Tanpa klien";
  const busName = item.bus_snapshot?.name || "Bus";

  return (
    <TouchableOpacity
      testID={`reservation-row-${item.id}`}
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowClient} numberOfLines={1}>
            {clientName}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {reservationStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.rowInfo}>
          <Feather name="truck" size={14} color={colors.textMute} />
          <Text style={styles.rowInfoText}>{busName}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Feather name="map-pin" size={14} color={colors.textMute} />
          <Text style={styles.rowInfoText} numberOfLines={1}>
            {item.destination || "-"}
          </Text>
        </View>
        <View style={styles.rowInfo}>
          <Feather name="calendar" size={14} color={colors.textMute} />
          <Text style={styles.rowInfoText}>
            {formatDateID(item.departure_date)}
            {item.return_date ? ` - ${formatDateID(item.return_date)}` : ""}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <Text style={styles.rowAmount}>{formatRp(item.total_price)}</Text>
        {item.downpayment > 0 && item.status !== "paid" && (
          <Text style={styles.rowDp}>DP: {formatRp(item.downpayment)}</Text>
        )}
        <TouchableOpacity
          style={styles.waBtn}
          onPress={(e) => {
            e.stopPropagation();
            onWhatsApp();
          }}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={16} color={colors.whatsapp} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty} testID="empty-state">
      <View style={styles.emptyIcon}>
        <Feather name="truck" size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada reservasi</Text>
      <Text style={styles.emptySub}>
        Buat reservasi pertama untuk pelanggan Anda.
      </Text>
      <TouchableOpacity
        testID="reservation-create-btn"
        style={styles.primaryBtn}
        onPress={onCreate}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Buat Reservasi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnGhost: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
  },
  summaryRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 18,
    gap: 8,
    minHeight: 96,
  },
  summaryCardAlt: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  summaryAmount: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  summaryAmountAlt: { color: colors.text, fontSize: 20 },
  filterWrap: { paddingTop: 18, paddingBottom: 4 },
  filterRow: { paddingHorizontal: 24, gap: 8, flexDirection: "row" },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMid, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowClient: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowInfoText: {
    fontSize: 13,
    color: colors.textMid,
    flex: 1,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  rowDp: {
    fontSize: 12,
    color: colors.textMute,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  waBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E7F9ED",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.status.booked.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  emptySub: {
    fontSize: 14,
    color: colors.textMute,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 16,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
