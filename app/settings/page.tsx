"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { api, Address, PaymentMethod } from '@/lib/api-client';
import { AppNotification } from '@/types/common';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import {
  ArrowLeft, User, Lock, Home, Bell, CreditCard, ClipboardList,
  Heart, Wallet, LogOut, CheckCircle, AlertCircle, Plus, Pencil,
  Trash2, BellOff, ShoppingBag, Tag, Loader2,
} from 'lucide-react';

const SettingsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState('profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telephone: ''
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const [prefs, setPrefs] = useState({
    emailNotifications: true
  });

  const [modal, setModal] = useState<{ type: 'add-address' | 'edit-address' | 'add-payment' | 'edit-payment' | 'delete' | null; id?: string }>({ type: null });
  const [modalForm, setModalForm] = useState({ title: '', address: '', phone: '', paymentType: 'MTN' });

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!api.isAuthenticated()) {
        router.push('/login');
        return;
      }
      const profile = await api.getUserProfile();
      if (profile) {
        setProfileForm({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || '',
          telephone: profile.telephone || ''
        });
      }

      const [addrs, pays] = await Promise.all([
        api.getAddresses(),
        api.getPaymentMethods(),
      ]);
      setAddresses(addrs);
      setPayments(pays);

      setNotifLoading(true);
      const notifs = await api.getNotifications();
      setNotifications(notifs);
      setNotifLoading(false);

      setLoading(false);
    };
    loadProfile();
  }, [router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateUserProfile(profileForm);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.changePassword(securityForm.currentPassword, securityForm.newPassword);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors du changement de mot de passe' });
    } finally {
      setSaving(false);
    }
  };

  const openAddAddress = () => {
    setModalForm({ title: '', address: '', phone: '', paymentType: 'MTN' });
    setModal({ type: 'add-address' });
  };

  const openEditAddress = (addr: Address) => {
    setModalForm({ title: addr.title, address: addr.address, phone: '', paymentType: 'MTN' });
    setModal({ type: 'edit-address', id: addr.id });
  };

  const saveAddress = async () => {
    if (!modalForm.title || !modalForm.address) return;
    setSaving(true);
    try {
      if (modal.type === 'add-address') {
        const res = await api.createAddress({ title: modalForm.title, address: modalForm.address });
        if (res.success) {
          setAddresses(prev => [...prev, res.address]);
          setMessage({ type: 'success', text: 'Adresse ajoutée avec succès' });
        }
      } else if (modal.type === 'edit-address' && modal.id) {
        const res = await api.updateAddress(modal.id, { title: modalForm.title, address: modalForm.address });
        if (res.success) {
          setAddresses(prev => prev.map(a => a.id === modal.id ? res.address : a));
          setMessage({ type: 'success', text: 'Adresse modifiée avec succès' });
        }
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
      setModal({ type: null });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteAddress = async (id: string) => {
    setSaving(true);
    try {
      const res = await api.deleteAddress(id);
      if (res.success) {
        setAddresses(prev => prev.filter(a => a.id !== id));
        setMessage({ type: 'success', text: 'Adresse supprimée' });
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la suppression' });
    } finally {
      setSaving(false);
      setModal({ type: null });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const openAddPayment = () => {
    setModalForm({ title: '', address: '', phone: '', paymentType: 'MTN' });
    setModal({ type: 'add-payment' });
  };

  const openEditPayment = (pay: PaymentMethod) => {
    setModalForm({ title: '', address: '', phone: pay.phone, paymentType: pay.type });
    setModal({ type: 'edit-payment', id: pay.id });
  };

  const savePayment = async () => {
    if (!modalForm.phone) return;
    setSaving(true);
    try {
      if (modal.type === 'add-payment') {
        const res = await api.createPaymentMethod({ type: modalForm.paymentType, phone: modalForm.phone });
        if (res.success) {
          setPayments(prev => [...prev, res.payment]);
          setMessage({ type: 'success', text: 'Moyen de paiement ajouté' });
        }
      } else if (modal.type === 'edit-payment' && modal.id) {
        const res = await api.updatePaymentMethod(modal.id, { type: modalForm.paymentType, phone: modalForm.phone });
        if (res.success) {
          setPayments(prev => prev.map(p => p.id === modal.id ? res.payment : p));
          setMessage({ type: 'success', text: 'Moyen de paiement modifié' });
        }
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setSaving(false);
      setModal({ type: null });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deletePayment = async (id: string) => {
    setSaving(true);
    try {
      const res = await api.deletePaymentMethod(id);
      if (res.success) {
        setPayments(prev => prev.filter(p => p.id !== id));
        setMessage({ type: 'success', text: 'Moyen de paiement supprimé' });
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la suppression' });
    } finally {
      setSaving(false);
      setModal({ type: null });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const setDefaultPayment = async (id: string) => {
    setSaving(true);
    try {
      const res = await api.setDefaultPaymentMethod(id);
      if (res.success) {
        setPayments(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
        setMessage({ type: 'success', text: 'Moyen de paiement par défaut mis à jour' });
      }
    } catch (error) {
      const err = error as Error;
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const inputClass = "w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  const sidebarItems = [
    { id: 'profil', label: 'Profil', Icon: User },
    { id: 'securite', label: 'Mot de passe', Icon: Lock },
    { id: 'adresses', label: 'Adresses', Icon: Home },
    { id: 'notifications', label: 'Notifications', Icon: Bell },
    { id: 'paiement', label: 'Paiement', Icon: CreditCard },
  ];

  const getNotifIcon = (type?: string) => {
    if (type === 'ORDER') return <ShoppingBag size={14} />;
    if (type === 'PAYMENT') return <CreditCard size={14} />;
    if (type === 'PROMO') return <Tag size={14} />;
    return <Bell size={14} />;
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F8FAFC] pt-10 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-12">

            {/* Sidebar */}
            <aside className="w-full lg:w-64 shrink-0">
              <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mb-4 transition-all group">
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Retour à l&apos;accueil</span>
              </Link>
              <h1 className="text-3xl font-extrabold text-primary mb-8">Paramètres</h1>
              <nav className="flex flex-col gap-1">
                {sidebarItems.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                      activeTab === id
                        ? 'bg-primary/10 text-primary font-bold shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 font-medium'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              {/* Quick links */}
              <div className="mt-8 pt-6 border-t border-gray-200 space-y-2">
                <Link href="/orders" className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-all text-sm font-medium">
                  <ClipboardList size={14} />
                  Mes commandes
                </Link>
                <Link href="/favorites" className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-all text-sm font-medium">
                  <Heart size={14} />
                  Mes favoris
                </Link>
                <Link href="/wallet" className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-all text-sm font-medium">
                  <Wallet size={14} />
                  Mon portefeuille
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    router.push('/login');
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium w-full"
                >
                  <LogOut size={14} />
                  Se déconnecter
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 space-y-8">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-slide-down ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              {/* Profile Section */}
              {activeTab === 'profil' && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Informations du Profil</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Nom complet</label>
                          <input
                            type="text"
                            value={`${profileForm.first_name} ${profileForm.last_name}`}
                            onChange={(e) => {
                              const parts = e.target.value.split(' ');
                              setProfileForm({ ...profileForm, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') });
                            }}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Adresse e-mail</label>
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:bg-[#16A34A] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                          {saving && <Loader2 size={14} className="animate-spin" />}
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              )}

              {/* Password Section */}
              {activeTab === 'securite' && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Modifier le mot de passe</h2>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Mot de passe actuel</label>
                        <input
                          type="password"
                          value={securityForm.currentPassword}
                          onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Nouveau mot de passe</label>
                          <input
                            type="password"
                            value={securityForm.newPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                            className={inputClass}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Confirmer le mot de passe</label>
                          <input
                            type="password"
                            value={securityForm.confirmPassword}
                            onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                            className={inputClass}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:bg-[#16A34A] transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                          {saving && <Loader2 size={14} className="animate-spin" />}
                          Mettre à jour
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              )}

              {/* Addresses Section */}
              {activeTab === 'adresses' && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Adresses de livraison</h2>
                    <button onClick={openAddAddress} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-all text-sm">
                      <Plus size={16} />
                      <span>Ajouter</span>
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {addresses.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Aucune adresse enregistrée</p>
                    ) : (
                      addresses.map((addr) => (
                        <div key={addr.id} className="p-4 rounded-xl bg-gray-50 flex justify-between items-center group hover:bg-gray-100 transition-all">
                          <div>
                            <h3 className="font-bold text-gray-900">{addr.title}</h3>
                            <p className="text-sm text-gray-500">{addr.address}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => openEditAddress(addr)} className="p-2 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
                            <button onClick={() => deleteAddress(addr.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* Notifications Section */}
              {activeTab === 'notifications' && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        {notifications.filter(n => !n.is_read).length} non lue{notifications.filter(n => !n.is_read).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-50">
                    {notifLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 size={28} className="text-primary animate-spin mx-auto" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <BellOff size={36} className="mx-auto opacity-30 mb-2" />
                        <p className="text-sm">Aucune notification pour le moment</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 flex items-start gap-4 transition-colors ${
                            !notif.is_read ? 'bg-primary/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            !notif.is_read ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notif.title || notif.message}
                            </p>
                            {notif.title && notif.message && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">
                              {notif.created_at ? new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <button
                              onClick={async () => {
                                await api.markNotificationAsRead(notif.id);
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                              }}
                              className="shrink-0 text-[10px] font-semibold text-primary hover:underline"
                            >
                              Lue
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notification preferences */}
                  <div className="p-6 border-t border-gray-100 space-y-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Préférences</h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-900">Notifications par e-mail</h3>
                        <p className="text-sm text-gray-500">Recevoir les mises à jour de commande et les offres.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={prefs.emailNotifications}
                          onChange={(e) => setPrefs({ ...prefs, emailNotifications: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-900">Notifications push</h3>
                        <p className="text-sm text-gray-500">Alertes en temps réel sur l&apos;état de vos commandes.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </section>
              )}

              {/* Payment Section */}
              {activeTab === 'paiement' && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Moyens de paiement</h2>
                    <button onClick={openAddPayment} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-all text-sm">
                      <Plus size={16} />
                      <span>Ajouter</span>
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {payments.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Aucun moyen de paiement enregistré</p>
                    ) : (
                      payments.map((pay) => (
                        <div key={pay.id} className="p-4 rounded-xl bg-gray-50 flex justify-between items-center group hover:bg-gray-100 transition-all">
                          <div className="flex items-center gap-4">
                            <Wallet size={18} className={pay.type === 'MTN' ? 'text-primary' : 'text-orange-500'} />
                            <div>
                              <h3 className="font-bold text-gray-900">{pay.label}</h3>
                              <p className="text-sm text-gray-500">{pay.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {pay.isDefault ? (
                              <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">Par défaut</span>
                            ) : (
                              <button onClick={() => setDefaultPayment(pay.id)} className="text-xs font-semibold text-gray-400 hover:text-primary bg-gray-100 hover:bg-primary/10 px-3 py-1 rounded-full transition-all">Définir par défaut</button>
                            )}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => openEditPayment(pay)} className="p-2 text-gray-400 hover:text-primary"><Pencil size={14} /></button>
                              <button onClick={() => deletePayment(pay.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {modal.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal({ type: null })}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
              {/* Address Modal */}
              {(modal.type === 'add-address' || modal.type === 'edit-address') && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {modal.type === 'add-address' ? 'Ajouter une adresse' : "Modifier l'adresse"}
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Titre</label>
                      <input
                        type="text"
                        placeholder="ex: Maison, Bureau..."
                        value={modalForm.title}
                        onChange={e => setModalForm({ ...modalForm, title: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Adresse complète</label>
                      <input
                        type="text"
                        placeholder="ex: Ange Raphael, Douala"
                        value={modalForm.address}
                        onChange={e => setModalForm({ ...modalForm, address: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setModal({ type: null })} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">Annuler</button>
                    <button onClick={saveAddress} className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-[#16A34A] transition-all shadow-lg shadow-primary/20">Enregistrer</button>
                  </div>
                </>
              )}

              {/* Payment Modal */}
              {(modal.type === 'add-payment' || modal.type === 'edit-payment') && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {modal.type === 'add-payment' ? 'Ajouter un moyen de paiement' : 'Modifier le paiement'}
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Opérateur</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setModalForm({ ...modalForm, paymentType: 'MTN' })}
                          className={`flex-1 p-3 rounded-xl border-2 text-center font-bold transition-all ${
                            modalForm.paymentType === 'MTN'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          MTN MoMo
                        </button>
                        <button
                          onClick={() => setModalForm({ ...modalForm, paymentType: 'Orange' })}
                          className={`flex-1 p-3 rounded-xl border-2 text-center font-bold transition-all ${
                            modalForm.paymentType === 'Orange'
                              ? 'border-orange-500 bg-orange-50 text-orange-600'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          Orange Money
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Numéro de téléphone</label>
                      <input
                        type="tel"
                        placeholder="+237 6XX XXX XXX"
                        value={modalForm.phone}
                        onChange={e => setModalForm({ ...modalForm, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setModal({ type: null })} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">Annuler</button>
                    <button onClick={savePayment} className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-[#16A34A] transition-all shadow-lg shadow-primary/20">Enregistrer</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

const SettingsPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
};

export default SettingsPage;
