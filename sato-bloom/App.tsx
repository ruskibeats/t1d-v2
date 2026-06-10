import React, { useState } from "react";
import PortraitScreen from "./src/screens/PortraitScreen";
import InsightsScreen from "./src/screens/InsightsScreen";
import InsightsScreen2 from "./src/screens/InsightsScreen2";

type ScreenName = "Portrait" | "Insights" | "Foods" | "Profile";

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("Portrait");

  if (screen === "Insights") return <InsightsScreen onNavigate={setScreen} />;
  if (screen === "Profile") return <InsightsScreen2 onNavigate={setScreen} />;
  // Foods screen - will navigate back to Portrait for now
  return <PortraitScreen onNavigate={setScreen} />;
}