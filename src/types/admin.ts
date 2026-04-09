export interface Client {
  id: number;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  hero_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  /** Present on dedicated property API responses */
  client_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyListResponse {
  success: true;
  data: Property[];
}

export interface PropertyDetailResponse {
  success: true;
  data: Property;
}

export interface PropertyMutationResponse {
  success: true;
  data: Property;
}

export interface PropertyBulkSkippedRow {
  row: number;
  reason: string;
}

export interface PropertyBulkImportResponse {
  success: true;
  imported: number;
  skipped: number;
  skipped_rows: PropertyBulkSkippedRow[];
}

export interface DeletePropertyResponse {
  success: true;
  message: string;
}

export interface Contact {
  id: number;
  /** Present on single-contact and mutation responses */
  client_id?: number;
  name: string;
  title: string | null;
  mobile: string;
  email: string;
  profile_image: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContactListResponse {
  success: true;
  data: Contact[];
}

export interface ContactDetailResponse {
  success: true;
  data: Contact;
}

export interface ContactMutationResponse {
  success: true;
  data: Contact;
}

export interface DeleteContactResponse {
  success: true;
  message: string;
}

export interface ClientDetail extends Client {
  properties: Property[];
  contacts: Contact[];
}

export interface ClientListResponse {
  success: true;
  data: Client[];
}

export interface ClientDetailResponse {
  success: true;
  data: ClientDetail;
}

export interface ClientMutationResponse {
  success: true;
  data: Client;
}

export interface DeleteClientResponse {
  success: true;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserListResponse {
  success: true;
  data: AdminUser[];
}

export interface AdminUserDetailResponse {
  success: true;
  data: AdminUser;
}

export interface AdminUserMutationResponse {
  success: true;
  data: AdminUser;
}

export interface DeleteAdminUserResponse {
  success: true;
  message: string;
}
