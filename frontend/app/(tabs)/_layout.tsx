import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMute,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Reservasi",
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size - 4} color={color} />,
          tabBarTestID: "nav-reservations-tab",
        }}
      />
      <Tabs.Screen
        name="fleet"
        options={{
          title: "Armada",
          tabBarIcon: ({ color, size }) => <Feather name="truck" size={size - 4} color={color} />,
          tabBarTestID: "nav-fleet-tab",
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: "Driver",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size - 4} color={color} />,
          tabBarTestID: "nav-drivers-tab",
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoice",
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size - 4} color={color} />,
          tabBarTestID: "nav-invoices-tab",
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Klien",
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size - 4} color={color} />,
          tabBarTestID: "nav-clients-tab",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size - 4} color={color} />,
          tabBarTestID: "nav-profile-tab",
        }}
      />
    </Tabs>
  );
}
