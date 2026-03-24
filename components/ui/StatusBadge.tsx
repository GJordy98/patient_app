interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  // Nouveaux Statuts backend
  PENDING:             { label: "En attente",       bg: "bg-orange-50",   text: "text-orange-600" },
  PARTIAL_VALIDATION:  { label: "Partiellement validée", bg: "bg-yellow-50", text: "text-yellow-600" },
  VALIDATED:           { label: "Validée",          bg: "bg-green-50",    text: "text-green-600" },
  PAYMENT_PENDING:     { label: "Paiement en attente", bg: "bg-amber-100",text: "text-amber-700" },
  IN_PICKUP:           { label: "Prêt collecte",    bg: "bg-blue-50",     text: "text-blue-600" },
  IN_TRANSIT:          { label: "En transit",       bg: "bg-blue-100",    text: "text-blue-700" },
  DELIVERED:           { label: "Livré",            bg: "bg-green-600",   text: "text-white" },
  COMPLETED:           { label: "Terminée",         bg: "bg-green-700",   text: "text-white" },
  CANCELLED:           { label: "Annulée",          bg: "bg-red-50",      text: "text-red-600" },
  
  // Statuts complémentaires de rétrocompatibilité (au cas où)
  ACCEPTED:            { label: "Acceptée",         bg: "bg-green-50",    text: "text-green-600" },
  RESERVED:            { label: "Acceptée",         bg: "bg-green-50",    text: "text-green-600" },
  IN_DELIVERY:         { label: "En livraison",     bg: "bg-blue-50",     text: "text-blue-700" },
  PENDING_PATIENT:     { label: "À confirmer",      bg: "bg-orange-50",   text: "text-orange-600" },
  REJECTED:            { label: "Rejetée",          bg: "bg-red-50",      text: "text-red-600" },
  APPROVED:            { label: "Approuvée",        bg: "bg-green-50",    text: "text-green-600" },
  READY_FOR_PICKUP:    { label: "Prêt collecte",    bg: "bg-blue-50",     text: "text-blue-600" },
  PICKED_UP:           { label: "Collecté",         bg: "bg-green-50",    text: "text-green-600" },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status?.toUpperCase()] ?? {
    label: status ?? "Inconnu",
    bg: "bg-gray-100",
    text: "text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
