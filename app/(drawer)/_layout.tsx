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
          name="(tabs)"
          options={{ title: "Home", headerShown: false }}
        />
        <Drawer.Screen
          name="officers"
          options={{ title: "Officers", headerShown: false }}
        />
        <Drawer.Screen
          name="explore"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
