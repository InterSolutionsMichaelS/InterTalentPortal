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
}

export interface Contact {
  id: number;
  name: string;
  mobile: string;
  email: string;
  profile_image: string | null;
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
