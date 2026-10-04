/**
 * API Cost Configuration
 * Source: Supabase pricing page (https://supabase.com/pricing) - Accessed 2025-01-04
 * All prices in USD
 */

export const SUPABASE_PRICING = {
  // Database
  database: {
    free: {
      size_gb: 0.5,
      included_mau: 50000,
      included_egress_gb: 5,
      included_storage_gb: 1,
    },
    pro: {
      base_price: 25, // $25/month
      size_gb: 8,
      included_mau: 100000,
      included_egress_gb: 250,
      included_storage_gb: 100,
      overage: {
        size_per_gb: 0.125,
        mau_per_user: 0.00325,
        egress_per_gb_uncached: 0.09,
        egress_per_gb_cached: 0.03,
        storage_per_gb: 0.0213,
      },
    },
  },

  // Compute (separate billing)
  compute: {
    micro: {
      price: 10, // $10/month
      cpu: '1-core ARM',
      ram_gb: 1,
    },
    small: {
      price: 15,
      cpu: '2-core ARM',
      ram_gb: 2,
    },
    medium: {
      price: 60,
      cpu: '2-core ARM',
      ram_gb: 4,
    },
  },

  // SMS (local hardware - no API cost)
  sms: {
    provider: 'local_sim900a',
    cost_per_sms: 0, // Hardware-based, no per-SMS cost
    hardware_cost: 'one-time',
  },

  // Video streaming (local Socket.IO - no cloud cost)
  video: {
    provider: 'local_socketio',
    cost_per_hour: 0, // Local server
    bandwidth_cost: 0, // Local network
  },

  // Payment webhooks (disabled)
  payments: {
    stripe: {
      enabled: false,
      cost_per_transaction: 0, // Not used
    },
    gcash: {
      enabled: false,
      cost_per_transaction: 0, // Not used
    },
  },
};

/**
 * Estimated cost per operation
 * Based on typical query patterns and data sizes
 */
export const COST_PER_OPERATION = {
  // Database reads (approximate egress cost)
  select_small: 0.000001, // ~1KB response
  select_medium: 0.00001, // ~10KB response
  select_large: 0.0001, // ~100KB response

  // Database writes
  insert: 0.000001,
  update: 0.000001,
  delete: 0.000001,

  // Auth
  auth_session: 0.000001,
  auth_signup: 0.000001,

  // Realtime subscriptions
  realtime_message: 0.000001,
  realtime_connection: 0.00001,
};

/**
 * Rate limits configuration
 */
export const RATE_LIMITS = {
  // Supabase has unlimited API requests on all plans
  // But we should implement application-level limits
  database: {
    reads_per_minute: 1000,
    writes_per_minute: 100,
  },
  sms: {
    per_ip_per_15min: 20, // Already implemented in server.js
    per_phone_per_hour: 10,
  },
  auth: {
    login_attempts_per_minute: 5,
    signup_attempts_per_hour: 3,
  },
};

/**
 * Spend caps (to be implemented)
 */
export const SPEND_CAPS = {
  daily_usd: 10,
  monthly_usd: 100,
  alert_thresholds: {
    warning: 0.5, // 50%
    critical: 0.8, // 80%
    emergency: 0.95, // 95%
  },
};
