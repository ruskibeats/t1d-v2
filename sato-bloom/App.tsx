import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import PortraitScreen from "./src/screens/PortraitScreen";
import DiscoverScreen from "./src/screens/DiscoverScreen";
import FoodsScreen from "./src/screens/FoodsScreen";
import SatoScreen from "./src/screens/SatoScreen";
import InsightsScreen2 from "./src/screens/InsightsScreen2";

type ScreenName = "Portrait" | "Discover" | "Foods" | "Profile" | "Sato";

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("Portrait");

  const renderScreen = () => {
    if (screen === "Discover") return <DiscoverScreen onNavigate={setScreen} />;
    if (screen === "Foods") return <FoodsScreen onNavigate={setScreen} />;
    if (screen === "Sato") return <SatoScreen onNavigate={setScreen} />;
    if (screen === "Profile") return <InsightsScreen2 onNavigate={setScreen} />;
    return <PortraitScreen onNavigate={setScreen} />;
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
    </SafeAreaProvider>
  );
}