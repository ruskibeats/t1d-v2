export type ScreenName = "Portrait" | "Discover" | "Foods" | "Profile" | "Sato";

export type Navigate = (screen: ScreenName) => void;

export type NavIcon = "portrait" | "foods" | "discover" | "sato" | "profile";