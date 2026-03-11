"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { api, UserData } from '@/lib/api-client';
import { AppNotification, Wallet as WalletData } from '@/types/common';
import Logo from '@/components/ui/Logo';
import {
  ShoppingCart, Bell, BellDot, BellOff, UserCircle, X, Menu,
  ShoppingBag, CreditCard, Megaphone, RefreshCw,
  ClipboardList, User, Settings, Wallet, LogOut,
  Home, Building2, Pill, FileText, Loader2, ChevronRight,
} from 'lucide-react';

/* ──────────────────────────────────────────────
   Header principal
────────────────────────────────────────────── */
const Header = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { items } = useCart();
  const cartCount = items.length;

  const loadNotifications = useCallback(async () => {
    if (!api.isAuthenticated()) return;
    try {
      setIsLoadingNotifications(true);
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: AppNotification) => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    const setup = async () => {
      if (api.isAuthenticated()) {
        loadNotifications();
        const profile: UserData | null = await api.getUserProfile();
        setUserData(profile);
        try {
          const w = await api.getWallet();
          if (w) setWalletBalance(w.balance);
        } catch {
          // silently ignore wallet errors in header
        }
      }
    };
    setup();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      loadNotifications();
    } catch {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const isOrderNotification = (notif: AppNotification): boolean => {
    const typeUp = notif.type?.toUpperCase() || '';
    return typeUp.includes('ORDER') || !!notif.order_id;
  };

  /* Extrait l'UUID de la commande depuis order_id ou le texte du message */
  const getOrderId = (notif: AppNotification): string | null => {
    if (notif.order_id) return notif.order_id;
    const match = (notif.message || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match ? match[0] : null;
  };

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.is_read) handleMarkAsRead(notif.id);
    const orderId = getOrderId(notif);
    if (orderId) {
      setNotificationPanelOpen(false);
      router.push(`/orders/${orderId}`);
    }
  };

  const userInitials = userData
    ? `${userData.first_name?.[0] || ''}${userData.last_name?.[0] || ''}`.toUpperCase() || '?'
    : null;

  const navLinks = [
    { href: '/', label: 'Accueil', Icon: Home },
    { href: '/pharmacies', label: 'Pharmacies', Icon: Building2 },
    { href: '/#productsSection', label: 'Produits', Icon: Pill },
    { href: '/#uploadSection', label: 'Ordonnances', Icon: FileText },
  ];

  const getNotifIcon = (notif: AppNotification) => {
    const typeUp = notif.type?.toUpperCase() || '';
    if (isOrderNotification(notif)) return <ShoppingBag size={15} />;
    if (typeUp === 'PAYMENT') return <CreditCard size={15} />;
    return <Megaphone size={15} />;
  };

  return (
    <header className="sticky top-0 z-[1001] w-full bg-white/98 backdrop-blur-md border-b border-gray-100"
      style={{ boxShadow: '0 2px 16px rgba(31,160,26,0.08)' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={44} variant="icon" />
            <div className="flex flex-col leading-[1.15]">
              <span className="text-[1.05rem] font-black text-primary tracking-tight group-hover:text-[#16A34A] transition-colors">
                e-Dr TIM
              </span>
              <span className="text-[0.6rem] font-bold text-primary/60 uppercase tracking-[0.18em]">
                PHARMACY
              </span>
            </div>
          </Link>

          {/* ── Desktop Navigation ── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1.5">

            {/* Wallet balance + Panier */}
            <div className="flex items-center gap-1">
              {walletBalance !== null && (
                <Link
                  href="/wallet"
                  title="Mon portefeuille"
                  className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl bg-primary/8 hover:bg-primary/15 transition-all duration-200 group"
                >
                  <Wallet size={15} className="text-primary shrink-0" />
                  <span className="text-[12px] font-black text-primary whitespace-nowrap">
                    {new Intl.NumberFormat('fr-FR').format(Math.round(walletBalance))} FCFA
                  </span>
                </Link>
              )}
              <Link
                href="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/8 transition-all duration-200 group"
                title="Mon panier"
              >
                <ShoppingCart size={20} className="text-gray-500 group-hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <span
                    id="cartBadge"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotificationPanelOpen(!notificationPanelOpen); setAccountMenuOpen(false); }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/8 transition-all duration-200 group"
                title="Notifications"
              >
                {unreadCount > 0
                  ? <BellDot size={20} className="text-gray-500 group-hover:text-primary transition-colors" />
                  : <Bell size={20} className="text-gray-500 group-hover:text-primary transition-colors" />
                }
                {unreadCount > 0 && (
                  <span
                    id="notificationsBadge"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* ── Notification Panel ── */}
              {notificationPanelOpen && (
                <div
                  className="absolute right-0 top-13 w-[26rem] max-w-[calc(100vw-1rem)] bg-white rounded-2xl z-50 max-h-[600px] overflow-hidden flex flex-col animate-slide-down"
                  style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(31,160,26,0.1)' }}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BellDot size={17} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <p className="text-[10px] text-primary font-semibold">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={loadNotifications}
                      disabled={isLoadingNotifications}
                      className="w-8 h-8 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={16} className={isLoadingNotifications ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {/* Liste */}
                  <div className="overflow-y-auto flex-1">
                    {isLoadingNotifications ? (
                      <div className="p-10 text-center flex flex-col items-center gap-3">
                        <Loader2 size={28} className="text-primary animate-spin" />
                        <p className="text-xs text-gray-400">Chargement...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                          <BellOff size={28} className="text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Aucune notification</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map((notif) => {
                          const isOrderNotif = isOrderNotification(notif);
                          const orderId = getOrderId(notif);

                          return (
                            <div
                              key={notif.id}
                              className={`p-4 transition-colors ${!notif.is_read ? 'bg-primary/5 border-l-[3px] border-l-primary' : 'hover:bg-gray-50'}`}
                            >
                              <div
                                onClick={() => { if (!notif.is_read) handleMarkAsRead(notif.id); }}
                                className="flex items-start gap-3"
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                  {getNotifIcon(notif)}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-[13px] font-bold text-gray-900 line-clamp-1">{notif.title}</h4>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                                      {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                </div>
                              </div>

                              {isOrderNotif && orderId && (
                                <div className="mt-2 ml-11">
                                  <Link
                                    href={`/orders/${orderId}`}
                                    onClick={() => { setNotificationPanelOpen(false); if (!notif.is_read) handleMarkAsRead(notif.id); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition-all"
                                  >
                                    <ClipboardList size={11} />
                                    Détail commande
                                    <ChevronRight size={10} />
                                  </Link>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-5 py-3 bg-gray-50/80 text-center border-t border-gray-100 shrink-0">
                      <Link href="/notifications" onClick={() => setNotificationPanelOpen(false)}
                        className="text-[11px] font-bold text-primary uppercase tracking-wider hover:underline">
                        Voir tout l&apos;historique
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mon Compte */}
            <div className="relative">
              <button
                onClick={() => { setAccountMenuOpen(!accountMenuOpen); setNotificationPanelOpen(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/8 transition-all duration-200 group"
                title="Mon compte"
              >
                {userInitials && userInitials !== '?' ? (
                  <span className="w-8 h-8 rounded-lg bg-primary text-white text-[13px] font-black flex items-center justify-center">
                    {userInitials}
                  </span>
                ) : (
                  <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                    <User size={18} />
                  </span>
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-13 w-68 bg-white rounded-2xl z-50 overflow-hidden animate-slide-down"
                  style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(31,160,26,0.1)' }}>
                  <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white font-black text-base flex items-center justify-center">
                        {userInitials && userInitials !== '?' ? userInitials : <User size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Mon Compte' : 'Mon Compte'}
                        </p>
                        {userData?.email && (
                          <p className="text-xs text-gray-500 truncate">{userData.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    {[
                      { href: '/settings?tab=profil', Icon: User, label: 'Mon Profil' },
                      { href: '/orders', Icon: ClipboardList, label: 'Mes Commandes' },
                      { href: '/wallet', Icon: Wallet, label: 'Mon Wallet' },
                      { href: '/settings?tab=securite', Icon: Settings, label: 'Paramètres' },
                    ].map(({ href, Icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setAccountMenuOpen(false)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/5 text-gray-700 hover:text-primary transition-all"
                      >
                        <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                          <Icon size={16} />
                        </span>
                        <span className="text-[13px] font-semibold">{label}</span>
                      </Link>
                    ))}

                    <div className="mx-4 my-2 h-px bg-gray-100" />

                    <button
                      onClick={() => { api.logout(); setAccountMenuOpen(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 text-red-500 transition-all"
                    >
                      <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400">
                        <LogOut size={16} />
                      </span>
                      <span className="text-[13px] font-semibold">Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 hover:bg-primary/8 transition-all"
            >
              {mobileMenuOpen
                ? <X size={20} className="text-gray-600" />
                : <Menu size={20} className="text-gray-600" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-slide-down">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-gray-700 hover:text-primary transition-all"
              >
                <Icon size={18} className="text-primary" />
                <span className="font-semibold text-sm">{label}</span>
              </Link>
            ))}

            <div className="my-2 h-px bg-gray-100" />

            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-gray-700 hover:text-primary transition-all"
            >
              <ShoppingCart size={18} className="text-primary" />
              <span className="font-semibold text-sm">Panier {cartCount > 0 && `(${cartCount})`}</span>
            </Link>

            <button
              onClick={() => { api.logout(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 transition-all text-left"
            >
              <LogOut size={18} />
              <span className="font-semibold text-sm">Déconnexion</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
