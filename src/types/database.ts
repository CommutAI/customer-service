// Auto-generated types matching the CommutAI database schema
// Re-run `supabase gen types typescript` to regenerate from your project

export type StaffRole = 'admin' | 'conductor' | 'cs_desk';
export type BusStatus = 'active' | 'maintenance' | 'inactive';
export type TripStatus = 'in_progress' | 'completed' | 'cancelled';
export type QRCardStatus = 'active' | 'lost' | 'replaced' | 'deactivated';
export type TicketStatus = 'issued' | 'validated' | 'expired';
export type TransactionType = 'fare_validation' | 'balance_topup' | 'card_issuance';
export type IrregularityType = 'double_scan' | 'count_mismatch' | 'fare_evasion' | 'other';
export type CsActionType = 'complaint' | 'inquiry' | 'refund' | 'lost_card' | 'other';

export interface Database {
  public: {
    Tables: {
      staff_users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: StaffRole;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff_users']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_users']['Insert']>;
      };
      buses: {
        Row: {
          id: string;
          plate_number: string;
          route: string;
          seat_capacity: number;
          status: BusStatus;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['buses']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['buses']['Insert']>;
      };
      trips: {
        Row: {
          id: string;
          bus_id: string;
          conductor_id: string;
          started_at: string;
          ended_at: string | null;
          status: TripStatus;
          current_lat: number | null;
          current_lng: number | null;
          gps_updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'started_at'> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
      };
      qr_cards: {
        Row: {
          id: string;
          card_uid: string;
          owner_name: string;
          contact_number: string | null;
          balance: number;
          status: QRCardStatus;
          allowed_routes: string[];
          passenger_id: string | null;
          issued_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['qr_cards']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['qr_cards']['Insert']>;
      };
      temporary_tickets: {
        Row: {
          id: string;
          ticket_uid: string;
          fare_amount: number;
          status: TicketStatus;
          allowed_routes: string[];
          passenger_id: string | null;
          trip_id: string | null;
          issued_by: string | null;
          issued_at: string;
          validated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['temporary_tickets']['Row'], 'id' | 'issued_at'> & {
          id?: string;
          issued_at?: string;
        };
        Update: Partial<Database['public']['Tables']['temporary_tickets']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          card_id: string | null;
          temp_ticket_id: string | null;
          trip_id: string | null;
          type: TransactionType;
          amount: number;
          channel: string;
          staff_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      passenger_counts: {
        Row: {
          id: string;
          trip_id: string;
          count: number;
          ai_count: number | null;
          source: string;
          recorded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['passenger_counts']['Row'], 'id' | 'recorded_at'> & {
          id?: string;
          recorded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['passenger_counts']['Insert']>;
      };
      boarded_passengers: {
        Row: {
          id: string;
          trip_id: string;
          passenger_id: string | null;
          card_id: string | null;
          temp_ticket_id: string | null;
          boarded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['boarded_passengers']['Row'], 'id' | 'boarded_at'> & {
          id?: string;
          boarded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['boarded_passengers']['Insert']>;
      };
      gps_logs: {
        Row: {
          id: string;
          trip_id: string;
          lat: number;
          lng: number;
          recorded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['gps_logs']['Row'], 'id' | 'recorded_at'> & {
          id?: string;
          recorded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['gps_logs']['Insert']>;
      };
      fare_irregularities: {
        Row: {
          id: string;
          trip_id: string;
          type: IrregularityType;
          description: string;
          detected_at: string;
          resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['fare_irregularities']['Row'], 'id' | 'detected_at'> & {
          id?: string;
          detected_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fare_irregularities']['Insert']>;
      };
      emergency_alerts: {
        Row: {
          id: string;
          trip_id: string;
          conductor_id: string;
          bus_id: string | null;
          lat: number | null;
          lng: number | null;
          status: string;
          notes: string | null;
          created_at: string;
          acknowledged_at: string | null;
          resolved_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['emergency_alerts']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['emergency_alerts']['Insert']>;
      };
      customer_service_logs: {
        Row: {
          id: string;
          trip_id: string | null;
          handled_by: string | null;
          action: CsActionType;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customer_service_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customer_service_logs']['Insert']>;
      };
    };
    Functions: {
      conductor_active_trip_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      staff_role: StaffRole;
      bus_status: BusStatus;
      trip_status: TripStatus;
      qr_card_status: QRCardStatus;
      ticket_status: TicketStatus;
      transaction_type: TransactionType;
      irregularity_type: IrregularityType;
      cs_action_type: CsActionType;
    };
  };
}
