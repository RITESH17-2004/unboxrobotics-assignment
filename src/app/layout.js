import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Load Outfit for body text
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

// Load JetBrains Mono for numbers and data
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata = {
  title: "SpeedoTrack — Premium Telemetry Dashboard",
  description: "Live telemetry dashboard visualizing real-time speed data.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable} h-full dark`}>
      <body className="min-h-full flex flex-col antialiased bg-black text-white selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
