import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/api/client";
import { colors } from "@/src/theme";

type Bus = {
  id: string;
  name: string;
  capacity: number;
  plate_number: string;
};

export default function FleetScreen() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [form, setForm] = useState({ name: "", capacity: "", plate_number: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listBuses();
      setBuses(data);
    } catch (e) {
      console.warn("load buses", e);
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

  const openCreate = () => {
    setEditingBus(null);
    setForm({ name: "", capacity: "", plate_number: "" });
    setModalVisible(true);
  };

  const openEdit = (bus: Bus) => {
    setEditingBus(bus);
    setForm({
      name: bus.name,
      capacity: String(bus.capacity),
      plate_number: bus.plate_number || "",
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Nama armada wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        capacity: parseInt(form.capacity) || 0,
        plate_number: form.plate_number.trim(),
      };
      if (editingBus) {
        await api.updateBus(editingBus.id, payload);
      } else {
        await api.createBus(payload);
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (bus: Bus) => {
    Alert.alert(
      "Hapus Armada",
      `Yakin ingin menghapus ${bus.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteBus(bus.id);
              load();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Gagal menghapus");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.root} testID="fleet-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>LUAR JENDELA CREATRIP</Text>
          <Text style={styles.title}>Armada</Text>
        </View>
        <TouchableOpacity
          testID="fleet-create-btn"
          style={styles.iconBtn}
          onPress={openCreate}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Feather name="truck" size={24} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.summaryLabel}>Total Armada</Text>
          <Text style={styles.summaryValue}>{buses.length} Bus</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : buses.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <FlatList
          testID="fleet-list"
          data={buses}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, paddingTop: 8 }}
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
            <BusRow item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
          )}
        />
      )}

      {/* Modal Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBus ? "Edit Armada" : "Tambah Armada"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nama Armada *</Text>
              <TextInput
                testID="bus-name-input"
                style={styles.input}
                placeholder="Contoh: Bus Pariwisata 45"
                placeholderTextColor={colors.textMute}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Kapasitas (Kursi)</Text>
              <TextInput
                testID="bus-capacity-input"
                style={styles.input}
                placeholder="45"
                placeholderTextColor={colors.textMute}
                keyboardType="number-pad"
                value={form.capacity}
                onChangeText={(v) => setForm({ ...form, capacity: v })}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Plat Nomor</Text>
              <TextInput
                testID="bus-plate-input"
                style={styles.input}
                placeholder="B 1234 XYZ"
                placeholderTextColor={colors.textMute}
                autoCapitalize="characters"
                value={form.plate_number}
                onChangeText={(v) => setForm({ ...form, plate_number: v })}
              />
            </View>

            <TouchableOpacity
              testID="bus-save-btn"
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BusRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Bus;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name="truck" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.name}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowMetaText}>{item.capacity} kursi</Text>
          {item.plate_number && (
            <>
              <Text style={styles.rowDot}>•</Text>
              <Text style={styles.rowMetaText}>{item.plate_number}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.rowAction} onPress={onEdit} activeOpacity={0.7}>
        <Feather name="edit-2" size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.rowAction} onPress={onDelete} activeOpacity={0.7}>
        <Feather name="trash-2" size={18} color={colors.status.overdue.text} />
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty} testID="empty-state">
      <View style={styles.emptyIcon}>
        <Feather name="truck" size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada armada</Text>
      <Text style={styles.emptySub}>Tambahkan bus/armada pertama Anda.</Text>
      <TouchableOpacity
        testID="fleet-create-empty-btn"
        style={styles.primaryBtn}
        onPress={onCreate}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Tambah Armada</Text>
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { fontSize: 12, color: colors.textMute, fontWeight: "600" },
  summaryValue: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.status.booked.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { fontSize: 16, fontWeight: "700", color: colors.text },
  rowMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  rowMetaText: { fontSize: 13, color: colors.textMid },
  rowDot: { marginHorizontal: 6, color: colors.textMute },
  rowAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
  emptySub: { fontSize: 14, color: colors.textMute, textAlign: "center", lineHeight: 20 },
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textMid, marginBottom: 8 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
