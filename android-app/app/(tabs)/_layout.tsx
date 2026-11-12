import { Tabs } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { ChamberBootstrap } from "@/components/chambers/ChamberBootstrap";

export default function TabLayout() {
  return (
    <>
      <ChamberBootstrap />
      <Tabs screenOptions={{ tabBarActiveTintColor: "#126B5D", headerShadowVisible: false }}>
      <Tabs.Screen name="cases" options={{ title: "Cases", tabBarIcon: ({ color, size }) => <Feather name="briefcase" color={color} size={size} /> }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarIcon: ({ color, size }) => <Feather name="folder" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Account", tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }} />
      </Tabs>
    </>
  );
}
