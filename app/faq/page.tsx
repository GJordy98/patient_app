"use client";

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Search, ChevronDown, SearchX } from 'lucide-react';

const faqData = [
  {
    category: 'Questions Générales',
    id: 'general',
    questions: [
      {
        q: 'Comment puis-je commander des médicaments ?',
        a: "Vous pouvez commander en recherchant le médicament souhaité, en l'ajoutant à votre panier, puis en suivant les étapes de validation de la commande. Une ordonnance valide peut être requise pour certains médicaments."
      },
      {
        q: 'Une ordonnance est-elle toujours nécessaire ?',
        a: "Non, seuls les médicaments sur ordonnance nécessitent une prescription médicale. Vous pouvez acheter des médicaments en vente libre sans ordonnance. Veuillez vérifier l'icône de prescription sur la page du produit."
      },
      {
        q: "Comment fonctionne la recherche de pharmacies ?",
        a: "Notre plateforme vous permet de rechercher des pharmacies proches de vous grâce à la géolocalisation. Vous pouvez aussi chercher par nom ou adresse et voir les produits disponibles dans chaque pharmacie."
      }
    ]
  },
  {
    category: 'Commandes & Paiements',
    id: 'orders',
    questions: [
      {
        q: 'Quels sont les moyens de paiement acceptés ?',
        a: "Nous acceptons les principales cartes de crédit (Visa, MasterCard) ainsi que les paiements via Mobile Money (Orange Money, MTN MoMo). Toutes les transactions sont sécurisées."
      },
      {
        q: 'Puis-je modifier ou annuler ma commande ?',
        a: "Vous pouvez modifier ou annuler votre commande tant qu'elle n'a pas été expédiée. Rendez-vous dans la section \"Mes Commandes\" de votre compte pour voir les options disponibles."
      },
      {
        q: 'Comment suivre ma commande ?',
        a: "Après avoir passé une commande, vous pouvez suivre son statut en temps réel depuis la section \"Mes Commandes\". Vous recevrez aussi des notifications par SMS et email à chaque étape."
      }
    ]
  },
  {
    category: 'Livraison & Retours',
    id: 'shipping',
    questions: [
      {
        q: 'Quels sont les délais de livraison ?',
        a: "Les délais de livraison varient en fonction de votre localisation. En général, la livraison standard prend 2 à 5 jours ouvrables. Une option de livraison express en 24h est également disponible."
      },
      {
        q: 'Puis-je retourner un produit ?',
        a: "Pour des raisons de sécurité sanitaire, les médicaments ne peuvent pas être retournés une fois dispensés. Cependant, si vous avez reçu un produit endommagé ou erroné, contactez notre service client dans les 48 heures."
      }
    ]
  },
  {
    category: 'Mon Compte',
    id: 'account',
    questions: [
      {
        q: 'Comment créer un compte ?',
        a: "Pour créer un compte, cliquez sur \"S'inscrire\" et remplissez le formulaire avec votre numéro de téléphone. Vous recevrez un code OTP pour vérifier votre numéro, puis vous pourrez accéder à toutes les fonctionnalités."
      },
      {
        q: 'Comment modifier mes informations personnelles ?',
        a: "Rendez-vous dans \"Paramètres\" depuis le menu de votre compte. Vous pouvez y modifier votre nom, email, et mot de passe. Votre numéro de téléphone ne peut pas être modifié directement."
      },
      {
        q: "J'ai oublié mon mot de passe, que faire ?",
        a: "Sur la page de connexion, cliquez sur \"Mot de passe oublié\". Entrez votre numéro de téléphone et vous recevrez un code OTP pour réinitialiser votre mot de passe."
      }
    ]
  }
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');

  const filteredData = faqData.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F8FAFC] pt-6 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Hero */}
          <div className="text-center py-12">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              Foire Aux Questions
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-3xl mx-auto">
              Trouvez des réponses rapides à vos questions. Si vous ne trouvez pas ce que vous cherchez, n&apos;hésitez pas à nous contacter.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-white border border-gray-200 py-3.5 pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                placeholder="Rechercher une question..."
              />
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Category Sidebar */}
            <aside className="md:col-span-1">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Catégories</h2>
              <ul className="space-y-2">
                {faqData.map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setActiveCategory(cat.id)}
                      className={`block w-full text-left py-2 px-3 rounded-lg font-medium transition-all ${
                        activeCategory === cat.id
                          ? 'text-primary bg-primary/10 font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat.category}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Questions */}
            <div className="md:col-span-3 space-y-10">
              {(searchQuery ? filteredData : faqData.filter(c => c.id === activeCategory)).map(cat => (
                <div key={cat.id}>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{cat.category}</h3>
                  <div className="space-y-3">
                    {cat.questions.map((item, idx) => (
                      <details key={idx} className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-gray-900">
                          <span>{item.q}</span>
                          <ChevronDown size={18} className="transition-transform group-open:rotate-180 text-gray-400 shrink-0 ml-2" />
                        </summary>
                        <div className="mt-4 text-gray-600 leading-relaxed text-sm">
                          {item.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}

              {searchQuery && filteredData.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <SearchX size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Aucun résultat trouvé pour &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
