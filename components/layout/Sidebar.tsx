"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ClipboardList,
  ShoppingBag,
  Wallet,
  UserCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/api-client";

const navItems = [
  { href: "/", icon: Search, label: "Rechercher" },
  { href: "/orders", icon: ClipboardList, label: "Mes commandes" },
  { href: "/cart", icon: ShoppingBag, label: "Panier" },
  { href: "/wallet", icon: Wallet, label: "Portefeuille" },
];

const bottomItems = [
  { href: "/settings", icon: Settings, label: "Paramètres" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    api.logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-[68px] h-[calc(100vh-68px)] w-64 bg-white border-r border-[#E2E8F0] z-30">
        {/* Logo supprimé */}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                    ? "bg-[#F0FDF4] text-[#22C55E]"
                    : "text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                  }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#22C55E] rounded-r-full" />
                )}
                <Icon
                  size={20}
                  className={isActive ? "text-[#22C55E]" : "text-[#94A3B8] group-hover:text-[#1E293B] transition-colors"}
                />
                <span className={`text-[14px] font-medium ${isActive ? "text-[#22C55E]" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-[#E2E8F0] space-y-1">
          {bottomItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                    ? "bg-[#F0FDF4] text-[#22C55E]"
                    : "text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                  }`}
              >
                <Icon size={20} />
                <span className="text-[14px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Profil */}
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition-all duration-200"
          >
            <UserCircle size={20} />
            <span className="text-[14px] font-medium">Profil</span>
          </Link>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#EF4444] hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="text-[14px] font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] z-40 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${isActive ? "text-[#22C55E]" : "text-[#94A3B8]"
                  }`}
              >
                <Icon size={22} className={isActive ? "text-[#22C55E]" : "text-[#94A3B8]"} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/settings"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${pathname === "/settings" ? "text-[#22C55E]" : "text-[#94A3B8]"
              }`}
          >
            <Settings size={22} />
            <span className="text-[10px] font-medium">Paramètres</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
