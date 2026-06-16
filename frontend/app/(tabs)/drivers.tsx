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

type Driver = {
  id: string;
  name: string;
  phone: string;
  license_number?: string;
};

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", license_number: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listDrivers();
      setDrivers(data);
    } catch (e) {
      console.warn("load drivers", e);
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
    setEditingDriver(null);
    setForm({ name: "", phone: "", license_number: "" });
    setModalVisible(true);
  };

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      phone: driver.phone || "",
      license_number: driver.license_number || "",
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Nama driver wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        license_number: form.license_number.trim(),
      };
      if (editingDriver) {
        await api.updateDriver(editingDriver.id, payload);
      } else {
        await api.createDriver(payload);
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (driver: Driver) => {
    Alert.alert(
      "Hapus Driver",
      `Yakin ingin menghapus ${driver.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteDriver(driver.id);
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
    <SafeAreaView edges={["top"]} style={styles.root} testID="drivers-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>LUAR JENDELA CREATRIP</Text>
          <Text style={styles.title}>Driver</Text>
        </View>
        <TouchableOpacity
          testID="driver-create-btn"
          style={styles.iconBtn}
          onPress={openCreate}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={22} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Feather name="user" size={24} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.summaryLabel}>Total Driver</Text>
          <Text style={styles.summaryValue}>{drivers.length} Orang</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : drivers.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <FlatList
          testID="driver-list"
          data={drivers}
          keyExtractor={(d) => d.id}
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
            <DriverRow item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
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
                {editingDriver ? "Edit Driver" : "Tambah Driver"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nama Driver *</Text>
              <TextInput
                testID="driver-name-input"
                style={styles.input}
                placeholder="Nama lengkap driver"
                placeholderTextColor={colors.textMute}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nomor Telepon</Text>
              <TextInput
                testID="driver-phone-input"
                style={styles.input}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={colors.textMute}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nomor SIM</Text>
              <TextInput
                testID="driver-license-input"
                style={styles.input}
                placeholder="Nomor SIM (opsional)"
                placeholderTextColor={colors.textMute}
                value={form.license_number}
                onChangeText={(v) => setForm({ ...form, license_number: v })}
              />
            </View>

            <TouchableOpacity
              testID="driver-save-btn"
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

function DriverRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Driver;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name="user" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.name}</Text>
        <View style={styles.rowMeta}>
          {item.phone && <Text style={styles.rowMetaText}>{item.phone}</Text>}
          {item.phone && item.license_number && <Text style={styles.rowDot}>•</Text>}
          {item.license_number && <Text style={styles.rowMetaText}>SIM: {item.license_number}</Text>}
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
        <Feather name="user" size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada driver</Text>
      <Text style={styles.emptySub}>Tambahkan driver pertama Anda.</Text>
      <TouchableOpacity
        testID="driver-create-empty-btn"
        style={styles.primaryBtn}
        onPress={onCreate}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Tambah Driver</Text>
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
