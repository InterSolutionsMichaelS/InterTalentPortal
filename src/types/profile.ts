/**
 * Profile Type Definitions
 * Based on CSV structure from InterTalent-Top-Talent data
 */

export interface Profile {
  id: string;
  firstName: string;
  lastInitial: string;
  city: string;
  state: string;
  zipCode: string;
  professionalSummary: string; // HTML content
  office: string;
  professionType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CSV Row structure (before transformation)
 */
export interface ProfileCSVRow {
  'First Name': string;
  'Last Initial': string;
  City: string;
  State: string;
  'Zip Code': string;
  'Professional Summary': string;
  Office: string;
  'Profession Type': string;
}

/**
 * Search/Filter Parameters
 */
export interface ProfileSearchParams {
  query?: string; // Keyword search in professional summary
  professionType?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  page?: number;
  limit?: number;
}

/**
 * API Response for profile listing
 */
export interface ProfileListResponse {
  profiles: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Order Request Form Data
 */
export interface OrderRequest {
  contactName: string;
  email: string;
  company: string;
  phone: string;
  region: string; // Used for email routing
  message: string;
  profileIds: string[]; // IDs of profiles they're interested in
  recaptchaToken: string;
}

/**
 * Data Sync Status
 */
export interface SyncStatus {
  lastSync: Date;
  status: 'success' | 'error' | 'in_progress';
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors?: string[];
}
