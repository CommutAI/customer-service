import type { Database } from './database';

// ── Raw DB row types ────────────────────────────────────────────────────────
export type DbQRCard = Database['public']['Tables']['qr_cards']['Row'];
export type DbTransaction = Database['public']['Tables']['transactions']['Row'];
export type DbStaffUser = Database['public']['Tables']['staff_users']['Row'];

// ── App-level view types (what the UI consumes) ─────────────────────────────

/** A registered card holder / passenger profile */
export interface Passenger {
  id: string;           // qr_cards.id
  name: string;         // qr_cards.owner_name
  phone: string;        // qr_cards.contact_number
  email?: string;
  cardId?: string;      // qr_cards.card_uid  (the human-readable UID)
  balance: number;      // qr_cards.balance
  status: 'active' | 'inactive';
  type?: 'Regular' | 'Student' | 'Senior Citizen';
  createdAt: string;    // qr_cards.created_at
  qrCode?: string;      // qr_cards.card_uid (same value, kept for backward-compat)
}

export interface QRCard {
  id: string;           // qr_cards.id (UUID)
  passengerId: string;  // qr_cards.passenger_id (UUID) or id when no separate profile
  cardId: string;       // qr_cards.card_uid
  passengerName: string;// qr_cards.owner_name
  passengerType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
  contactNumber: string;// qr_cards.contact_number
  status: 'active' | 'disabled' | 'lost';
  issuedAt: string;     // qr_cards.created_at
  expiresAt?: string;
  qrCode: string;       // qr_cards.card_uid
  isTemporary?: boolean; // Flag to identify temporary QR cards
}

export interface Transaction {
  id: string;
  passengerId: string;
  passengerName: string;
  type: 'top_up' | 'fare' | 'refund' | 'ticket_purchase';
  amount: number;
  balanceAfter: number;
  timestamp: string;
  method?: 'cash' | 'card' | 'qr';
}

export interface Notification {
  id: string;
  type: 'replacement_request' | 'failed_scan' | 'system_alert';
  message: string;
  timestamp: string;
  read: boolean;
  passengerId?: string;
}

export interface DashboardStats {
  todayRegistrations: number;
  todayTopUps: number;
  todayTransactions: number;
  totalRevenue: number;
}
