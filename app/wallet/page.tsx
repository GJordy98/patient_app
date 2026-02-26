"use client";
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api-client';
import { Wallet, AppTransaction } from '@/types/common';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';

const WalletPage = () => {
    const { isAuthenticated } = useAuthGuard();
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<AppTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRechargeModal, setShowRechargeModal] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [walletData, txData] = await Promise.all([
                    api.getWallet(),
                    api.getWalletTransactions()
                ]);
                setWallet(walletData);
                setTransactions(txData);
            } catch (error) {
                console.error('Error loading wallet data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isAuthenticated]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Chargement de votre portefeuille...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!wallet) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center px-4">
                        <span className="material-symbols-outlined text-gray-300 text-6xl mb-4 block">account_balance_wallet</span>
                        <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">Portefeuille indisponible</h3>
                        <p className="text-gray-500 text-sm">Impossible de charger votre portefeuille. Veuillez réessayer.</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const availableBalance = wallet ? wallet.balance - wallet.locked_amount : 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display flex flex-col">
            <Header />
            
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="h-10 w-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mon Portefeuille</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Main Balance Card */}
                    <div className="md:col-span-2 bg-linear-to-br from-primary to-green-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl transition-all group-hover:bg-white/20"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-bold uppercase tracking-wider opacity-80">Solde Total</span>
                                <span className="material-symbols-outlined text-3xl opacity-50">account_balance_wallet</span>
                            </div>
                            <div className="mb-8">
                                <span className="text-5xl font-black tracking-tight">{formatPrice(wallet?.balance || 0)}</span>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowRechargeModal(true)}
                                    className="px-6 py-3 bg-white text-primary font-bold rounded-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">add_circle</span>
                                    Recharger
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-4xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between p-4 mb-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                                    <span className="text-xs font-bold text-green-700 dark:text-green-400">Disponible</span>
                                </div>
                                <span className="font-black text-green-700 dark:text-green-400">{formatPrice(availableBalance)}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-600 text-sm">lock</span>
                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Bloqué</span>
                                </div>
                                <span className="font-black text-orange-700 dark:text-orange-400">{formatPrice(wallet?.locked_amount || 0)}</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-4 italic">
                            Les fonds bloqués sont réservés pour vos commandes en attente.
                        </p>
                    </div>
                </div>

                {/* Transactions History */}
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">history</span>
                            Dernières transactions
                        </h3>
                        <button className="text-xs font-bold text-primary hover:underline uppercase tracking-wider">Tout voir</button>
                    </div>
                    
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {transactions.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <span className="material-symbols-outlined text-5xl opacity-20 mb-2">list_alt</span>
                                <p>Aucune transaction récente</p>
                            </div>
                        ) : (
                            transactions.map((tx) => (
                                <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                            tx.type === 'CREDIT' 
                                            ? 'bg-green-100 text-green-600' 
                                            : 'bg-red-100 text-red-600'
                                        }`}>
                                            <span className="material-symbols-outlined">
                                                {tx.type === 'CREDIT' ? 'add_card' : 'payments'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{tx.description}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    tx.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`text-right font-black ${
                                        tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {tx.type === 'CREDIT' ? '+' : '-'}{formatPrice(tx.amount)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Recharge Modal Placeholder */}
            {showRechargeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-8 text-center text-pretty">
                            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl">contactless</span>
                            </div>
                            <h3 className="text-2xl font-black mb-4 dark:text-white text-gray-900">Rechargement bientôt disponible</h3>
                            <p className="text-gray-500 mb-8">
                                Nous intégrons actuellement les solutions de paiement mobiles (Orange Money, Mobile Money) pour vous offrir la meilleure expérience.
                            </p>
                            <button 
                                onClick={() => setShowRechargeModal(false)}
                                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
                            >
                                J&apos;ai compris
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default WalletPage;
