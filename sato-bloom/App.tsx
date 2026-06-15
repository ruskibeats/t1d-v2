import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { NavigationProvider, useRoute } from "./src/navigation/NavigationProvider";
import { GlucoseProvider, useGlucose } from "./src/context/GlucoseContext";
import { LogProvider } from "./src/context/LogContext";
import { PatternProvider } from "./src/context/PatternContext";
import { Feather } from "@expo/vector-icons";
import PortraitScreen from "./src/screens/PortraitScreen";
import FoodsScreen from "./src/screens/FoodsScreen";
import DiscoverScreen from "./src/screens/DiscoverScreen";
import SatoScreen from "./src/screens/SatoScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import RevelationScreen from "./src/screens/RevelationScreen";
import FoodMemoryScreen from "./src/screens/FoodMemoryScreen";
import LogScreen from "./src/screens/LogScreen";
import AllDiscoveriesScreen from "./src/screens/AllDiscoveriesScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import { PaperBackground } from "./src/components/PaperBackground";
import { AppHeader } from "./src/components/AppHeader";
import { TopActions } from "./src/components/TopActions";
import { TabBar } from "./src/components/TabBar";
import { useNavigation, MainTab } from "./src/navigation/NavigationProvider";
import { ScreenTransition } from "./src/components/ScreenTransition";

function MainTabLayout({ children, currentTab }: { children: React.ReactNode, currentTab: MainTab | undefined }) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  return (
    <PaperBackground>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <TopActions />
        <AppHeader />
        {children}
        <TabBar active={currentTab} onSelect={(tab) => nav.goToTab(tab)} />
      </View>
    </PaperBackground>
  );
}

function RouterHost() {
  const route = useRoute();
  const { status, showAlert, glucose, dismissAlert } = useGlucose();

  let activeScreen = null;

  if (route.kind === "revelation") {
    activeScreen = <RevelationScreen revelationId={route.id} />;
  } else if (route.kind === "foodMemory") {
    activeScreen = <FoodMemoryScreen foodId={route.foodId} />;
  } else if (route.kind === "profile") {
    activeScreen = <ProfileScreen />;
  } else if (route.kind === "notifications") {
    activeScreen = <NotificationsScreen />;
  } else if (route.kind === "log") {
    activeScreen = <LogScreen />;
  } else if (route.kind === "allDiscoveries") {
    activeScreen = <AllDiscoveriesScreen />;
  } else {
    let TabContent = null;
    switch (route.tab) {
      case "portrait":
        TabContent = <PortraitScreen />;
        break;
      case "foods":
        TabContent = <FoodsScreen />;
        break;
      case "discover":
        TabContent = <DiscoverScreen />;
        break;
      case "sato":
        TabContent = <SatoScreen />;
        break;
    }
    activeScreen = <MainTabLayout currentTab={route.tab}>{TabContent}</MainTabLayout>;
  }

  const isHypo = status === 'hypo';
  const alertColor = isHypo ? '#D97947' : '#B97B3F';

  return (
    <View style={{ flex: 1 }}>
      <ScreenTransition>
        {activeScreen}
      </ScreenTransition>

      {/* Global Emergency Glucose Alert Overlay */}
      {showAlert && status !== 'normal' && (
        <View style={isHypo ? styles.hypoBackdrop : styles.hyperBackdrop}>
          <View style={isHypo ? styles.hypoCard : styles.hyperCard}>
            <View style={styles.alertHeaderRow}>
              <Feather 
                name={isHypo ? "droplet" : "sun"} 
                size={22} 
                color={alertColor} 
              />
              <Text style={[styles.alertTitle, { color: alertColor }]}>
                {isHypo ? 'An urgent ripple • Glucose low' : 'An accumulation of warmth • Glucose high'}
              </Text>
            </View>
            
            <View style={styles.alertValueContainer}>
              <Text style={[styles.alertValueNumber, { color: alertColor }]}>{glucose}</Text>
              <Text style={styles.alertValueUnit}>mg/dL</Text>
            </View>

            <Text style={styles.alertBody}>
              {isHypo
                ? "Your glucose levels are dipping. Ground yourself with a small cup of juice, sweet fruit, or warm honey to restore balance."
                : "Your glucose levels are rising with warmth. Consider a gentle stroll or active breathing to help the energy settle, or check your insulin balance."
              }
            </Text>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => dismissAlert()}
              style={[
                styles.alertBtn,
                isHypo ? styles.hypoBtn : styles.hyperBtn
              ]}
            >
              <Text style={[
                styles.alertBtnText,
                isHypo ? styles.hypoBtnText : styles.hyperBtnText
              ]}>
                {isHypo ? 'Grounding myself' : 'Restoring balance'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GlucoseProvider>
        <LogProvider>
          <NavigationProvider>
            <PatternProvider>
              <RouterHost />
            </PatternProvider>
          </NavigationProvider>
        </LogProvider>
      </GlucoseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  hypoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 22, 20, 0.78)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  hyperBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(217, 121, 71, 0.38)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  hypoCard: {
    backgroundColor: '#1E1B18', // Deep dark stone
    borderWidth: 1,
    borderColor: '#D97947',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  hyperCard: {
    backgroundColor: '#FCFAF6', // Warm cream paper
    borderWidth: 1,
    borderColor: '#B97B3F',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  alertTitle: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18,
    letterSpacing: 0.3,
    flex: 1,
  },
  alertValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 12,
  },
  alertValueNumber: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 54,
    letterSpacing: -1,
  },
  alertValueUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#7E756A',
    marginLeft: 6,
  },
  alertBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#7E756A',
    textAlign: 'center',
    marginBottom: 24,
  },
  alertBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  hypoBtn: {
    backgroundColor: '#D97947',
    borderColor: 'transparent',
  },
  hyperBtn: {
    backgroundColor: 'transparent',
    borderColor: '#B97B3F',
  },
  alertBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  hypoBtnText: {
    color: '#FFFFFF',
  },
  hyperBtnText: {
    color: '#B97B3F',
  },
});