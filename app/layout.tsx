import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeToggleFab from "@/components/layout/ThemeToggleFab";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "e-Dr Tim Pharmacy - Votre pharmacie en ligne",
  description: "Commandez vos médicaments en ligne et récupérez-les en pharmacie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      </head>
      <body className={`${outfit.variable} antialiased font-display`} suppressHydrationWarning>
        <ThemeProvider>
          <CartProvider>
            {children}
            <ThemeToggleFab />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
