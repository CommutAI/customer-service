/**
 * supabaseApi.ts
 * All data operations backed by the CommutAI Supabase database.
 * This module exports an object with the same shape as the old `apiCalls`
 * so existing pages require zero changes.
 */

import { supabase } from './supabase';
import type {
  Passenger,
  QRCard,
  Transaction,
  Notification,
  DashboardStats,
} from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Map DB qr_cards row → app Passenger */
function rowToPassenger(row: any): Passenger {
  const dbStatus: string = row.status;
  const appStatus: 'active' | 'inactive' =
    dbStatus === 'active' ? 'active' : 'inactive';

  return {
    id: row.id,
    name: row.owner_name,
    phone: row.contact_number ?? '',
    cardId: row.card_uid,
    balance: Number(row.balance),
    status: appStatus,
    createdAt: row.created_at,
    qrCode: row.card_uid,
  };
}

/** Map DB qr_cards row → app QRCard */
function rowToQRCard(row: any): QRCard {
  const statusMap: Record<string, 'active' | 'disabled' | 'lost'> = {
    active: 'active',
    lost: 'lost',
    replaced: 'disabled',
    deactivated: 'disabled',
  };
  // passenger type stored in allowed_routes[0] as a tag e.g. "type:Student"
  const typeTag = (row.allowed_routes ?? []).find((r: string) => r.startsWith('type:'));
  const passengerType = typeTag
    ? (typeTag.replace('type:', '') as QRCard['passengerType'])
    : 'Regular';
  
  // Detect temporary cards by checking for "temporary" tag in allowed_routes
  const isTemporary = (row.allowed_routes ?? []).some((r: string) => r === 'temporary');

  return {
    id: row.id,
    passengerId: row.passenger_id ?? row.id,
    cardId: row.card_uid,
    passengerName: row.owner_name ?? 'Temporary Card',
    passengerType,
    contactNumber: row.contact_number ?? '',
    status: statusMap[row.status] ?? 'disabled',
    issuedAt: row.created_at,
    qrCode: row.card_uid,
    isTemporary,
  };
}

/** Map DB transactions row → app Transaction (needs card owner name lookup) */
function rowToTransaction(row: any, ownerName = 'Unknown'): Transaction {
  const typeMap: Record<string, Transaction['type']> = {
    balance_topup: 'top_up',
    fare_validation: 'fare',
    card_issuance: 'ticket_purchase',
  };
  const methodMap: Record<string, Transaction['method']> = {
    qr_card: 'qr',
    temp_ticket: 'qr',
    cash: 'cash',
    card: 'card',
  };
  return {
    id: row.id,
    passengerId: row.card_id ?? '',
    passengerName: ownerName,
    type: typeMap[row.type] ?? 'fare',
    amount: row.type === 'balance_topup' ? Math.abs(Number(row.amount)) : -Math.abs(Number(row.amount)),
    balanceAfter: 0, // Not stored; would need a separate query
    timestamp: row.created_at,
    method: methodMap[row.channel] ?? 'cash',
  };
}

// ── exported API calls ────────────────────────────────────────────────────

export const supabaseApiCalls = {
  // ── Dashboard ──────────────────────────────────────────────────────────
  getDashboardStats: async (): Promise<DashboardStats> => {
    const start = `${today()}T00:00:00.000Z`;
    const end = `${today()}T23:59:59.999Z`;

    const [cardsResult, topupsResult, txResult] = await Promise.all([
      supabase
        .from('qr_cards')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'balance_topup')
        .gte('created_at', start)
        .lte('created_at', end),
      supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'balance_topup')
        .gte('created_at', start)
        .lte('created_at', end),
    ]);

    const totalRevenue = (txResult.data ?? []).reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    const { count: txCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end);

    return {
      todayRegistrations: cardsResult.count ?? 0,
      todayTopUps: topupsResult.count ?? 0,
      todayTransactions: txCount ?? 0,
      totalRevenue,
    };
  },

  // ── Passengers (backed by qr_cards) ───────────────────────────────────
  getPassengers: async (): Promise<Passenger[]> => {
    const { data, error } = await supabase
      .from('qr_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToPassenger);
  },

  getPassenger: async (id: string): Promise<Passenger | undefined> => {
    const { data, error } = await supabase
      .from('qr_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return rowToPassenger(data);
  },

  createPassenger: async (
    passenger: Omit<Passenger, 'id' | 'createdAt'>
  ): Promise<Passenger> => {
    const uid = `CARD${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase
      .from('qr_cards')
      .insert({
        card_uid: uid,
        owner_name: passenger.name,
        contact_number: passenger.phone,
        balance: passenger.balance ?? 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToPassenger(data);
  },

  updatePassenger: async (
    id: string,
    passenger: Partial<Passenger>
  ): Promise<Passenger> => {
    const updates: Record<string, unknown> = {};
    if (passenger.name) updates.owner_name = passenger.name;
    if (passenger.phone !== undefined) updates.contact_number = passenger.phone;

    const { data, error } = await supabase
      .from('qr_cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToPassenger(data);
  },

  deactivatePassenger: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('qr_cards')
      .update({ status: 'deactivated' })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // ── QR Cards ───────────────────────────────────────────────────────────
  getQRCards: async (): Promise<QRCard[]> => {
    const { data, error } = await supabase
      .from('qr_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToQRCard);
  },

  issueQRCard: async (registration: {
    ownerName: string;
    contactNumber: string;
    passengerType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
  }): Promise<QRCard> => {
    // Generate card type indicator + 8-digit random number
    const typeIndicators: Record<string, string> = {
      'Regular': 'RC',
      'Student': 'SC',
      'Senior Citizen': 'SCC',
      'PWD': 'PC'
    };
    const indicator = typeIndicators[registration.passengerType] || 'RC';
    const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    const formattedNum = `${randomNum.slice(0, 3)}-${randomNum.slice(3, 5)}-${randomNum.slice(5)}`;
    const uid = `${indicator}—${formattedNum}`;
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('qr_cards')
      .insert({
        card_uid: uid,
        owner_name: registration.ownerName,
        contact_number: registration.contactNumber,
        balance: 0,
        status: 'active',
        issued_by: session?.user?.id ?? null,
        // Store passenger type as a tag in allowed_routes array
        allowed_routes: [`type:${registration.passengerType}`],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToQRCard(data);
  },

  activateQR: async (cardId: string): Promise<void> => {
    const { error } = await supabase
      .from('qr_cards')
      .update({ status: 'active' })
      .eq('card_uid', cardId);

    if (error) throw new Error(error.message);
  },

  disableCard: async (cardId: string): Promise<void> => {
    const { error } = await supabase
      .from('qr_cards')
      .update({ status: 'deactivated' })
      .eq('card_uid', cardId);

    if (error) throw new Error(error.message);
  },

  replaceCard: async (cardId: string): Promise<QRCard> => {
    // Mark old card as replaced
    const { data: old, error: oldErr } = await supabase
      .from('qr_cards')
      .update({ status: 'replaced' })
      .eq('card_uid', cardId)
      .select()
      .single();

    if (oldErr) throw new Error(oldErr.message);

    const newUid = `CARD${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase
      .from('qr_cards')
      .insert({
        card_uid: newUid,
        owner_name: old.owner_name,
        contact_number: old.contact_number,
        balance: old.balance,
        status: 'active',
        passenger_id: old.passenger_id,
        issued_by: old.issued_by,
        allowed_routes: old.allowed_routes ?? [`type:Regular`],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToQRCard(data);
  },

  generateQR: async (cardId: string): Promise<string> => {
    const { data, error } = await supabase
      .from('qr_cards')
      .select('card_uid')
      .eq('card_uid', cardId)
      .single();

    if (error) throw new Error(error.message);
    return data.card_uid;
  },

  // ── Transactions ───────────────────────────────────────────────────────
  getTransactions: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, qr_cards(owner_name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const ownerName = (row as any).qr_cards?.owner_name ?? 'Unknown';
      return rowToTransaction(row, ownerName);
    });
  },

  topUp: async (
    passengerId: string,
    amount: number,
    method: 'cash' | 'card'
  ): Promise<Transaction> => {
    // 1. Fetch current card by card_uid (the format like "RC—12345678", "SC—12345678", etc.)
    const { data: card, error: cardErr } = await supabase
      .from('qr_cards')
      .select('*')
      .eq('card_uid', passengerId)
      .single();

    if (cardErr) throw new Error(cardErr.message);

    // 2. Get passenger type for discount calculation
    const typeTag = (card.allowed_routes ?? []).find((r: string) => r.startsWith('type:'));
    const passengerType = typeTag
      ? typeTag.replace('type:', '')
      : 'Regular';

    // 3. Apply 20% discount for Student, Senior Citizen, and PWD (Philippine law)
    let finalAmount = amount;
    let discountApplied = 0;
    if (['Student', 'Senior Citizen', 'PWD'].includes(passengerType)) {
      discountApplied = amount * 0.20; // 20% discount
      finalAmount = amount - discountApplied;
    }

    const newBalance = Number(card.balance) + finalAmount;

    // 4. Update balance using the card's UUID (id field)
    const { error: updateErr } = await supabase
      .from('qr_cards')
      .update({ balance: newBalance })
      .eq('id', card.id);

    if (updateErr) throw new Error(updateErr.message);

    // 5. Get staff session
    const { data: { session } } = await supabase.auth.getSession();

    // 6. Insert transaction record using the card's UUID (id field)
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        card_id: card.id,
        type: 'balance_topup',
        amount: finalAmount,
        channel: method,
        staff_id: session?.user?.id ?? null,
      })
      .select()
      .single();

    if (txErr) throw new Error(txErr.message);

    return {
      id: tx.id,
      passengerId: card.id,
      passengerName: card.owner_name,
      type: 'top_up',
      amount,
      balanceAfter: newBalance,
      timestamp: tx.created_at,
      method,
    };
  },

  // ── Temporary QR Cards ─────────────────────────────────────────────────
  createTemporaryQRCard: async (passengerType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD' = 'Regular'): Promise<QRCard> => {
    // Generate temporary card type indicator + 8-digit random number
    const typeIndicators: Record<string, string> = {
      'Regular': 'TRC',
      'Student': 'TSC',
      'Senior Citizen': 'TSCC',
      'PWD': 'TPC'
    };
    const indicator = typeIndicators[passengerType] || 'TRC';
    const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    const formattedNum = `${randomNum.slice(0, 3)}-${randomNum.slice(3, 5)}-${randomNum.slice(5)}`;
    const uid = `${indicator}—${formattedNum}`;
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('qr_cards')
      .insert({
        card_uid: uid,
        owner_name: 'Temporary Card',
        contact_number: '',
        balance: 100, // ₱100 initial balance
        status: 'active',
        allowed_routes: ['temporary', `type:${passengerType}`], // Tag to identify temporary cards and type
        issued_by: session?.user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToQRCard(data);
  },

  getTemporaryQRCards: async (): Promise<QRCard[]> => {
    const { data, error } = await supabase
      .from('qr_cards')
      .select('*')
      .contains('allowed_routes', ['temporary'])
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToQRCard);
  },

  deactivateTemporaryQRCard: async (cardId: string): Promise<void> => {
    const { error } = await supabase
      .from('qr_cards')
      .update({ status: 'deactivated' })
      .eq('id', cardId);

    if (error) throw new Error(error.message);
  },

  // ── Notifications (sourced from customer_service_logs) ────────────────
  getNotifications: async (): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('customer_service_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row): Notification => ({
      id: row.id,
      type: row.action === 'lost_card' ? 'replacement_request'
        : row.action === 'complaint' ? 'failed_scan'
        : 'system_alert',
      message: row.description ?? `${row.action} logged`,
      timestamp: row.created_at,
      read: false, // cs_logs don't track read state; extend schema if needed
    }));
  },

  markNotificationRead: async (_id: string): Promise<void> => {
    // customer_service_logs has no read flag; this is a no-op until
    // a notifications table is added. The UI will still toggle optimistically.
  },

  // ── Customer Lookup ───────────────────────────────────────────────────
  searchPassengers: async (
    query: string,
    field: 'qr' | 'name' | 'phone' | 'cardId'
  ): Promise<Passenger[]> => {
    if (!query) return [];

    let qb = supabase.from('qr_cards').select('*');

    if (field === 'qr' || field === 'cardId') {
      qb = qb.ilike('card_uid', `%${query}%`);
    } else if (field === 'name') {
      qb = qb.ilike('owner_name', `%${query}%`);
    } else if (field === 'phone') {
      qb = qb.ilike('contact_number', `%${query}%`);
    }

    const { data, error } = await qb.limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToPassenger);
  },
};
