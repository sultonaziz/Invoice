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

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type CalendarReservation = {
  id: string;
  departure_date: string;
  return_date?: string;
  client_snapshot?: { name: string };
  bus_snapshot?: { name: string };
  status: string;
};

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getReservationCalendar(year, month);
      setReservations(data);
    } catch (e) {
      console.warn("load calendar", e);
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
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (number | null)[] = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    
    return days;
  }, [year, month]);

  // Map reservations to dates
  const dateReservationMap = useMemo(() => {
    const map: Record<string, CalendarReservation[]> = {};
    reservations.forEach((r) => {
      const start = new Date(r.departure_date);
      const end = r.return_date ? new Date(r.return_date) : start;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map[key]) map[key] = [];
        map[key].push(r);
      }
    });
    return map;
  }, [reservations]);

  const selectedReservations = useMemo(() => {
    if (!selectedDate) return [];
    return dateReservationMap[selectedDate] || [];
  }, [selectedDate, dateReservationMap]);

  const formatDateKey = (day: number) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
  };

  const handleCreateReservation = () => {
    if (selectedDate) {
      router.push(`/reservation/new?date=${selectedDate}`);
    } else {
      router.push("/reservation/new");
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kalender Reservasi</Text>
        <TouchableOpacity
          testID="calendar-create-btn"
          style={styles.addBtn}
          onPress={handleCreateReservation}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
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

      {/* Calendar Grid */}
      <View style={styles.calendarWrap}>
        {/* Day Headers */}
        <View style={styles.dayHeaderRow}>
          {DAYS.map((d) => (
            <View key={d} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCell} />;
              }
              const dateKey = formatDateKey(day);
              const hasReservation = dateReservationMap[dateKey]?.length > 0;
              const reservationCount = dateReservationMap[dateKey]?.length || 0;
              const isSelected = selectedDate === dateKey;
              const todayFlag = isToday(day);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    todayFlag && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDate(dateKey)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      todayFlag && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasReservation && (
                    <View style={[styles.dot, reservationCount > 1 && styles.dotMultiple]}>
                      {reservationCount > 1 && (
                        <Text style={styles.dotText}>{reservationCount}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Selected Date Reservations */}
      <View style={styles.detailSection}>
        {selectedDate ? (
          <>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>
                {parseInt(selectedDate.split("-")[2])} {MONTHS[month - 1]} {year}
              </Text>
              <Text style={styles.detailCount}>
                {selectedReservations.length} reservasi
              </Text>
            </View>
            <ScrollView style={styles.detailList} showsVerticalScrollIndicator={false}>
              {selectedReservations.length === 0 ? (
                <View style={styles.noReservation}>
                  <Text style={styles.noReservationText}>Tidak ada reservasi</Text>
                  <TouchableOpacity
                    style={styles.createSmallBtn}
                    onPress={handleCreateReservation}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color={colors.primary} />
                    <Text style={styles.createSmallBtnText}>Buat Reservasi</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                selectedReservations.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.reservationCard}
                    onPress={() => router.push(`/reservation/${r.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reservationIcon}>
                      <Feather name="truck" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reservationClient}>
                        {r.client_snapshot?.name || "Tanpa klien"}
                      </Text>
                      <Text style={styles.reservationBus}>
                        {r.bus_snapshot?.name || "Bus"}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.status[r.status]?.bg || colors.status.booked.bg }]}>
                      <Text style={[styles.statusText, { color: colors.status[r.status]?.text || colors.status.booked.text }]}>
                        {r.status === "booked" ? "Booking" : r.status === "downpayment" ? "DP" : r.status === "paid" ? "Lunas" : "Batal"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </>
        ) : (
          <View style={styles.selectPrompt}>
            <Feather name="calendar" size={32} color={colors.textMute} />
            <Text style={styles.selectPromptText}>Pilih tanggal untuk melihat reservasi</Text>
          </View>
        )}
      </View>
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
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
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
  calendarWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dayHeaderRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMute,
  },
  loadingWrap: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayCellToday: {
    backgroundColor: colors.status.booked.bg,
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  dayTextToday: {
    color: colors.primary,
  },
  dayTextSelected: {
    color: "#fff",
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dotMultiple: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  detailSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  detailCount: {
    fontSize: 14,
    color: colors.textMute,
  },
  detailList: {
    flex: 1,
  },
  noReservation: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  noReservationText: {
    fontSize: 14,
    color: colors.textMute,
  },
  createSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  createSmallBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  reservationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  reservationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.status.booked.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  reservationClient: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  reservationBus: {
    fontSize: 13,
    color: colors.textMid,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  selectPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  selectPromptText: {
    fontSize: 14,
    color: colors.textMute,
    textAlign: "center",
  },
});
