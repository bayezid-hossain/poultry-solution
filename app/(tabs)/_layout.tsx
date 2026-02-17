import { CustomDrawerContent } from "@/components/custom-drawer-content";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function TabsDrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          drawerStyle: {
            width: 280,
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{ title: "Home" }}
        />
        <Drawer.Screen
          name="cycles"
          options={{ title: "Cycles" }}
        />
        <Drawer.Screen
          name="farmers"
          options={{ title: "Farmers" }}
        />
        <Drawer.Screen
          name="overview"
          options={{ title: "Overview" }}
        />
        <Drawer.Screen
          name="officers"
          options={{ title: "Officers" }}
        />
        <Drawer.Screen
          name="settings"
          options={{ title: "Settings" }}
        />
        <Drawer.Screen
          name="explore"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
