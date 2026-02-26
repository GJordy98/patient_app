import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { api, UserData } from '@/lib/api-client';
import { requestForToken } from '@/lib/firebase';
import { AppNotification } from '@/types/common';
import Logo from '@/components/ui/Logo';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
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
        try {
          const token = await requestForToken();
          if (token && localStorage.getItem('access_token') !== 'mock-access-token') {
            await api.registerFCMToken(token);
          }
        } catch (error) {
          console.error('FCM registration failed:', error);
        }
        loadNotifications();
        const profile: UserData | null = await api.getUserProfile();
        setUserData(profile);
      }
    };
    setup();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const userInitials = userData
    ? `${userData.first_name?.[0] || ''}${userData.last_name?.[0] || ''}`.toUpperCase() || '?'
    : null;

  const navLinks = [
    { href: '/', label: 'Accueil', icon: 'home' },
    { href: '/pharmacies', label: 'Pharmacies', icon: 'local_pharmacy' },
    { href: '/#productsSection', label: 'Produits', icon: 'medication' },
    { href: '/#uploadSection', label: 'Ordonnances', icon: 'description' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/98 dark:bg-gray-900/98 backdrop-blur-md border-b border-gray-100 dark:border-gray-800"
      style={{ boxShadow: '0 2px 16px rgba(31,160,26,0.08)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={44} variant="icon" />
            <div className="flex flex-col leading-[1.15]">
              <span className="text-[1.05rem] font-black text-primary tracking-tight group-hover:text-primary-dark transition-colors">
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
                className="relative px-4 py-2 text-[13px] font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1.5">

            {/* Panier */}
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/8 transition-all duration-200 group"
              title="Mon panier"
            >
              <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors text-[22px]">
                shopping_cart
              </span>
              {cartCount > 0 && (
                <span
                  id="cartBadge"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotificationPanelOpen(!notificationPanelOpen); setAccountMenuOpen(false); }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/8 transition-all duration-200 group"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors text-[22px]">
                  {unreadCount > 0 ? 'notifications_active' : 'notifications'}
                </span>
                {unreadCount > 0 && (
                  <span
                    id="notificationsBadge"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {notificationPanelOpen && (
                <div className="absolute right-0 top-13 w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 rounded-2xl z-50 max-h-[520px] overflow-hidden flex flex-col animate-slide-down"
                  style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(31,160,26,0.1)' }}>
                  {/* Header panel */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[18px]">notifications_active</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
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
                      <span className={`material-symbols-outlined text-[18px] ${isLoadingNotifications ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                  </div>

                  {/* Notification list */}
                  <div className="overflow-y-auto flex-1">
                    {isLoadingNotifications ? (
                      <div className="p-10 text-center flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-gray-400">Chargement...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-gray-300">notifications_off</span>
                        </div>
                        <p className="text-sm text-gray-400">Aucune notification</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer ${!notif.is_read ? 'bg-primary/5 border-l-[3px] border-l-primary' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-primary/15 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                <span className="material-symbols-outlined text-[16px]">
                                  {notif.type === 'ORDER' ? 'shopping_bag' : notif.type === 'PAYMENT' ? 'payments' : 'campaign'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-[13px] font-bold text-gray-900 dark:text-white line-clamp-1">{notif.title}</h4>
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                                    {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-5 py-3 bg-gray-50/80 dark:bg-gray-900/50 text-center border-t border-gray-100 dark:border-gray-700">
                      <Link href="/settings?tab=notifications" onClick={() => setNotificationPanelOpen(false)}
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
                {userInitials ? (
                  <span className="w-8 h-8 rounded-lg bg-primary text-white text-[13px] font-black flex items-center justify-center">
                    {userInitials}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors text-[22px]">
                    account_circle
                  </span>
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-13 w-68 bg-white dark:bg-gray-800 rounded-2xl z-50 overflow-hidden animate-slide-down"
                  style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(31,160,26,0.1)' }}>
                  {/* User info */}
                  <div className="px-5 py-4 bg-linear-to-r from-primary/5 to-transparent border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white font-black text-base flex items-center justify-center">
                        {userInitials || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                          {userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Mon Compte' : 'Mon Compte'}
                        </p>
                        {userData?.email && (
                          <p className="text-xs text-gray-500 truncate">{userData.email}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    {[
                      { href: '/settings?tab=profil', icon: 'person', label: 'Mon Profil' },
                      { href: '/orders', icon: 'receipt_long', label: 'Mes Commandes' },
                      { href: '/wallet', icon: 'account_balance_wallet', label: 'Mon Wallet' },
                      { href: '/settings?tab=securite', icon: 'settings', label: 'Paramètres' },
                    ].map(({ href, icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setAccountMenuOpen(false)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/5 text-gray-700 dark:text-gray-300 hover:text-primary transition-all"
                      >
                        <span className={`w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center material-symbols-outlined text-[18px] text-gray-400`}>
                          {icon}
                        </span>
                        <span className="text-[13px] font-semibold">{label}</span>
                      </Link>
                    ))}

                    <div className="mx-4 my-2 h-px bg-gray-100 dark:bg-gray-700" />

                    <button
                      onClick={() => { api.logout(); setAccountMenuOpen(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all"
                    >
                      <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center material-symbols-outlined text-[18px] text-red-400">
                        logout
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
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-primary/8 transition-all"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-[22px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 animate-slide-down">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-gray-700 dark:text-gray-300 hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
                <span className="font-semibold text-sm">{label}</span>
              </Link>
            ))}

            <div className="my-2 h-px bg-gray-100 dark:bg-gray-700" />

            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-gray-700 dark:text-gray-300 hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">shopping_cart</span>
              <span className="font-semibold text-sm">Panier {cartCount > 0 && `(${cartCount})`}</span>
            </Link>

            <button
              onClick={() => { api.logout(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all text-left"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-semibold text-sm">Déconnexion</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
