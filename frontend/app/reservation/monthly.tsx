import { useCallback, useState, useMemo } from "react";
import {
  ActivityIndicator,
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
import { formatRp, formatDateID } from "@/src/utils/format";
import { reservationStatusLabel } from "@/src/utils/reservation";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function MonthlyOverviewScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlyReservationSummary(year, month);
      setSummary(data);
    } catch (e) {
      console.warn("load monthly summary", e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Group reservations by date
  const groupedReservations = useMemo(() => {
    if (!summary?.reservations) return {};
    const groups: Record<string, any[]> = {};
    summary.reservations.forEach((r: any) => {
      const date = r.departure_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });
    return groups;
  }, [summary]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedReservations).sort();
  }, [groupedReservations]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ringkasan Bulanan</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {MONTHS[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.summaryLabel}>Total Reservasi</Text>
              <Text style={styles.summaryValue}>{summary?.total_reservations || 0}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.status.paid.bg }]}>
              <Text style={[styles.summaryLabel, { color: colors.status.paid.text }]}>Lunas</Text>
              <Text style={[styles.summaryValue, { color: colors.status.paid.text }]}>
                {formatRp(summary?.total_paid || 0)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.status.downpayment.bg }]}>
              <Text style={[styles.summaryLabel, { color: colors.status.downpayment.text }]}>DP Masuk</Text>
              <Text style={[styles.summaryValue, { color: colors.status.downpayment.text }]}>
                {formatRp(summary?.total_dp || 0)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.status.overdue.bg }]}>
              <Text style={[styles.summaryLabel, { color: colors.status.overdue.text }]}>Belum Bayar</Text>
              <Text style={[styles.summaryValue, { color: colors.status.overdue.text }]}>
                {formatRp(summary?.pending_payment || 0)}
              </Text>
            </View>
          </View>

          {/* Status Breakdown */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Status Reservasi</Text>
            <View style={styles.statusRow}>
              {Object.entries(summary?.by_status || {}).map(([status, count]) => (
                <View key={status} style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: colors.status[status]?.bg || colors.status.booked.bg }]} />
                  <Text style={styles.statusName}>{reservationStatusLabel(status)}</Text>
                  <Text style={styles.statusCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Reservations List by Date */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Daftar Reservasi</Text>
            {sortedDates.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="calendar" size={32} color={colors.textMute} />
                <Text style={styles.emptyText}>Tidak ada reservasi bulan ini</Text>
              </View>
            ) : (
              sortedDates.map((date) => (
                <View key={date} style={styles.dateGroup}>
                  <View style={styles.dateHeader}>
                    <Feather name="calendar" size={14} color={colors.primary} />
                    <Text style={styles.dateText}>{formatDateID(date)}</Text>
                    <Text style={styles.dateCount}>{groupedReservations[date].length} reservasi</Text>
                  </View>
                  {groupedReservations[date].map((rsv: any) => (
                    <TouchableOpacity
                      key={rsv.id}
                      style={styles.reservationCard}
                      onPress={() => router.push(`/reservation/${rsv.id}`)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardLeft}>
                        <Text style={styles.clientName} numberOfLines={1}>
                          {rsv.client_snapshot?.name || "Tanpa klien"}
                        </Text>
                        <View style={styles.cardMeta}>
                          <Feather name="truck" size={12} color={colors.textMute} />
                          <Text style={styles.metaText}>{rsv.bus_snapshot?.name || "Bus"}</Text>
                        </View>
                        <View style={styles.cardMeta}>
                          <Feather name="map-pin" size={12} color={colors.textMute} />
                          <Text style={styles.metaText} numberOfLines={1}>{rsv.destination || "-"}</Text>
                        </View>
                      </View>
                      <View style={styles.cardRight}>
                        <View style={[styles.statusBadge, { backgroundColor: colors.status[rsv.status]?.bg || colors.status.booked.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: colors.status[rsv.status]?.text || colors.status.booked.text }]}>
                            {reservationStatusLabel(rsv.status)}
                          </Text>
                        </View>
                        <Text style={styles.priceText}>{formatRp(rsv.total_price)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
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
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusName: {
    fontSize: 13,
    color: colors.textMid,
  },
  statusCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  listSection: {},
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMute,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  dateCount: {
    fontSize: 12,
    color: colors.textMute,
  },
  reservationCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMid,
    flex: 1,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});
