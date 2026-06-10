import React, { useState } from "react";
import PortraitScreen from "./src/screens/PortraitScreen";
import InsightsScreen from "./src/screens/InsightsScreen";

type ScreenName = "Portrait" | "Insights" | "Foods" | "Profile";

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("Portrait");

  if (screen === "Insights") return <InsightsScreen onNavigate={setScreen} />;
  // Foods and Profile screens will be added later
  return <PortraitScreen onNavigate={setScreen} />;
}