import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import ToastContainer from "@/components/ui/ToastContainer";
import FCMInitializer from "@/components/ui/FCMInitializer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EdoctorPharma – Votre pharmacie en ligne",
  description: "Recherchez et commandez vos médicaments, livrés directement chez vous.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body
        className={`${inter.variable} font-[var(--font-inter)] antialiased bg-white text-[#1E293B]`}
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
      >
        <CartProvider>
          {children}
          <ToastContainer />
          <FCMInitializer />
        </CartProvider>
      </body>
    </html>
  );
}
