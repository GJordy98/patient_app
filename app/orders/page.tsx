"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api-client';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Order } from '@/types/order';

/* ─── Status Configuration (simplified 3-step from legacy) ─── */
const statusConfig: Record<string, { label: string; gradient: string; icon: string; group: 'in_progress' | 'completed' | 'cancelled' }> = {
  'PENDING':    { label: 'Validé',         gradient: 'from-orange-400 to-orange-500', icon: 'check_circle',    group: 'in_progress' },
  'CONFIRMED':  { label: 'Confirmée',      gradient: 'from-orange-400 to-orange-500', icon: 'check_circle',    group: 'in_progress' },
  'PROCESSING': { label: 'En préparation', gradient: 'from-purple-400 to-purple-500', icon: 'autorenew',       group: 'in_progress' },
  'IN_PICKUP':  { label: 'Récupération',   gradient: 'from-teal-400 to-teal-500',     icon: 'shopping_bag',    group: 'in_progress' },
  'DELIVERY':   { label: 'En livraison',   gradient: 'from-blue-500 to-blue-600',     icon: 'local_shipping',  group: 'in_progress' },
  'ARRIVED':    { label: 'Arrivée',        gradient: 'from-blue-400 to-blue-500',     icon: 'home',            group: 'in_progress' },
  'DELIVERED':  { label: 'Livrée',         gradient: 'from-green-400 to-green-500',   icon: 'check_circle',    group: 'completed' },
  'COMPLETED':  { label: 'Terminée',       gradient: 'from-green-500 to-green-600',   icon: 'done_all',        group: 'completed' },
  'CANCELLED':  { label: 'Annulée',        gradient: 'from-red-400 to-red-500',       icon: 'cancel',          group: 'cancelled' },
};


/* ─── 3-Step Timeline Miniature ─── */
const getStepIndex = (status: string): number => {
  const s = status?.toUpperCase();
  if (['PENDING', 'CONFIRMED', 'PROCESSING'].includes(s)) return 0;
  if (['IN_PICKUP', 'DELIVERY'].includes(s)) return 1;
  if (['DELIVERED', 'COMPLETED'].includes(s)) return 2;
  return 0;
};

const MiniTimeline = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Validé', icon: '✓' },
    { label: 'En route', icon: '🚚' },
    { label: 'Livré', icon: '📦' },
  ];
  const currentStep = getStepIndex(status);

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, i) => {
        const isActive = i <= currentStep;
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? i === currentStep
                      ? 'bg-linear-to-br from-primary to-green-600 text-white ring-2 ring-primary/30'
                      : 'bg-linear-to-br from-green-400 to-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                }`}
              >
                {step.icon}
              </div>
              <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded-full -mt-3 ${
                  i < currentStep ? 'bg-linear-to-r from-green-400 to-green-500' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ─── Filter Tab Types ─── */
type FilterType = 'all' | 'in_progress' | 'completed' | 'cancelled';

const ORDERS_PER_PAGE = 10;


/* ─── Main Page ─── */
const OrdersPage = () => {
  const { isAuthenticated } = useAuthGuard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [displayedCount, setDisplayedCount] = useState(ORDERS_PER_PAGE);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Sans filtre status : on charge toutes les commandes
        const data = await api.getMyOrders();

        const list = Array.isArray(data) ? data : (data.results || []);
        // Sort by creation date descending
        list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        setOrders(list);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated]);

  /* ─── Computed ─── */
  const counts = useMemo(() => {
    const inProgress = orders.filter(o =>
      ['PENDING', 'CONFIRMED', 'PROCESSING', 'IN_PICKUP', 'DELIVERY', 'ARRIVED'].includes(o.status?.toUpperCase())
    ).length;
    const completed = orders.filter(o =>
      ['DELIVERED', 'COMPLETED'].includes(o.status?.toUpperCase())
    ).length;
    const cancelled = orders.filter(o =>
      ['CANCELLED'].includes(o.status?.toUpperCase())
    ).length;
    return { all: orders.length, in_progress: inProgress, completed, cancelled };

  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'in_progress') {
      return orders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'IN_PICKUP', 'DELIVERY', 'ARRIVED'].includes(o.status?.toUpperCase()));
    }
    if (filter === 'completed') {
      return orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status?.toUpperCase()));
    }
    if (filter === 'cancelled') {
      return orders.filter(o => ['CANCELLED'].includes(o.status?.toUpperCase()));
    }
    return orders;
  }, [orders, filter]);


  const visibleOrders = filteredOrders.slice(0, displayedCount);
  const hasMore = filteredOrders.length > displayedCount;
  const remainingCount = filteredOrders.length - displayedCount;

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setDisplayedCount(ORDERS_PER_PAGE);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs: { key: FilterType; label: string; icon: string; countKey: keyof typeof counts }[] = [
    { key: 'all',         label: 'Toutes',    icon: 'list',           countKey: 'all' },
    { key: 'in_progress', label: 'En cours',  icon: 'local_shipping', countKey: 'in_progress' },
    { key: 'completed',   label: 'Terminées', icon: 'check_circle',   countKey: 'completed' },
    { key: 'cancelled',   label: 'Annulées',  icon: 'cancel',         countKey: 'cancelled' },
  ];


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display">
      <Header />

      {/* ─── Sticky Header with Tabs ─── */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-3 md:px-4 py-3 md:py-5">
          {/* Title + Refresh */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <button onClick={() => window.history.back()} className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-primary transition-all p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              <span className="hidden sm:inline font-semibold text-sm">Retour</span>
            </button>

            <h1 className="text-base md:text-xl font-bold bg-linear-to-r from-primary to-green-600 bg-clip-text text-transparent">
              <span className="hidden sm:inline">Mes Commandes</span>
              <span className="sm:hidden">Commandes</span>
            </h1>

            <button
              onClick={() => { setLoading(true); api.getMyOrders().then(data => { const list = Array.isArray(data) ? data : (data.results || []); list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()); setOrders(list); setLoading(false); }).catch(() => setLoading(false)); }}
              className="text-gray-700 dark:text-gray-300 hover:text-primary transition-all hover:rotate-180 duration-500 shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Actualiser"
            >
              <span className="material-symbols-outlined text-xl">refresh</span>
            </button>
          </div>

          {/* ─── Filter Tabs ─── */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`order-tab shrink-0 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
                  filter === tab.key
                    ? 'bg-linear-to-r from-primary to-green-600 text-white shadow-lg shadow-primary/30'
                    : 'bg-white/80 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-2 border-transparent hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                  filter === tab.key ? 'bg-white/30' : 'bg-gray-100 dark:bg-gray-600'
                }`}>
                  {counts[tab.countKey]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <main className="max-w-5xl mx-auto px-3 md:px-4 py-6 md:py-8">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-semibold">Chargement de vos commandes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-6 bg-linear-to-br from-primary/10 to-green-100 dark:from-primary/20 dark:to-green-900/30 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-6xl">receipt_long</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {filter === 'all' ? 'Aucune commande' : filter === 'in_progress' ? 'Aucune commande en cours' : 'Aucune commande terminée'}
            </h3>
            <p className="text-gray-500 mb-8">
              {filter === 'all' ? 'Commencez vos achats dès maintenant' : 'Aucune commande trouvée dans cette catégorie'}
            </p>
            {filter === 'all' && (
              <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-primary to-green-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <span className="material-symbols-outlined">shopping_bag</span>
                Découvrir nos produits
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleOrders.map((order, i) => {
                const status = statusConfig[order.status?.toUpperCase()] || statusConfig['PENDING'];
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="order-card block bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 border border-gray-100 dark:border-gray-700 animate-slide-up hover:shadow-xl transition-all"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {/* Header: Status icon + ID + Date */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl bg-linear-to-r ${status.gradient} flex items-center justify-center shadow-lg`}>
                          <span className="material-symbols-outlined text-white text-xl">{status.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                            #{order.order_id || order.id?.substring(0, 8)}
                          </h3>
                          <p className="text-xs text-gray-500">{formatDate(order.created_at || order.date)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-primary">
                          {(parseFloat(String(order.total_amount)) || 0).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-linear-to-r ${status.gradient} text-white shadow-sm`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Items count + pharmacy */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
                      <span>{order.items?.length || 0} article(s)</span>
                      {order.pharmacy_name && (
                        <span className="truncate">📍 {order.pharmacy_name}</span>
                      )}
                    </div>

                    {/* Mini Timeline */}
                    {order.status?.toUpperCase() !== 'CANCELLED' && (
                      <MiniTimeline status={order.status} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={() => setDisplayedCount(prev => prev + ORDERS_PER_PAGE)}
                  className="px-8 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto"
                >
                  <span className="material-symbols-outlined">expand_more</span>
                  Voir plus ({remainingCount})
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrdersPage;
