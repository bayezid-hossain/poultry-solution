import { CustomDrawerContent } from "@/components/custom-drawer-content";
import { Drawer } from "expo-router/drawer";
import { View } from "react-native";

export default function TabsDrawerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          swipeEnabled: true,
          swipeEdgeWidth: 100,
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
          name="members"
          options={{ title: "Members", headerShown: false }}
        />

        <Drawer.Screen
          name="stock-ledger"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />
        <Drawer.Screen
          name="doc-placements"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />
        <Drawer.Screen
          name="performance"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />
        <Drawer.Screen
          name="production"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false
          }}
        />

      </Drawer>
    </View>
  );
}
