/**
 * api.ts
 * Single export point for all data operations.
 * Now backed by Supabase — mock data is no longer used at runtime.
 */

import { supabaseApiCalls } from './supabaseApi';

export const apiCalls = supabaseApiCalls;

export default apiCalls;
