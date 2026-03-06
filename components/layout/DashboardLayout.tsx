"use client";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  /** Si true, le contenu prend tout l'espace sans padding (utile pour la carte plein écran) */
  fullHeight?: boolean;
  /** Si true, supprime le padding pour les pages qui gèrent leur propre layout */
  noPadding?: boolean;
}

export default function DashboardLayout({ children, title, fullHeight = false, noPadding = false }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header pleine largeur sticky */}
      <Header />

      <div className="flex">
        {/* Sidebar fixe, part sous le header */}
        <Sidebar />

        {/* Zone de contenu principale */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-[calc(100vh-68px)]">
          {title && (
            <div className="px-4 lg:px-6 pt-6 pb-2">
              <h1 className="text-[20px] font-bold text-[#1E293B]">{title}</h1>
            </div>
          )}
          <main className={
            fullHeight ? "flex-1 flex flex-col" :
            noPadding ? "flex-1 flex flex-col" :
            "flex-1 p-4 lg:p-6 pb-24 lg:pb-6"
          }>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
