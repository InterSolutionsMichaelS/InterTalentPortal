/**
 * Database Abstraction Interface
 * This interface allows database operations without dependency on specific implementation
 */
import type { Ad } from '@/types/ad';
/**
 * Profile type definition
 */
export type Profile = {
  id: string;
  first_name: string;
  last_initial: string;
  city: string;
  state: string;
  zip_code: string;
  professional_summary: string;
  office: string;
  profession_type: string;
  skills: string[] | null;
  created_at: string;
  updated_at: string;
  source_file: string | null;
  is_active: boolean;
};

/**
 * Search/Filter Parameters
 */
export interface ProfileSearchParams {
  query?: string; // Single keyword (legacy, kept for hero search)
  keywords?: string[]; // Multiple keywords for OR search
  professionTypes?: string[]; // Multiple professions for OR search (from hero OR sidebar)
  city?: string;
  state?: string;
  address?: string;
  zipCode?: string;
  zipCodes?: string[]; // Multiple zip codes for OR search
  radius?: number; // Radius in miles for zip code search
  office?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'location' | 'profession';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedProfiles {
  profiles: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * State information
 */
export interface StateInfo {
  code: string;
  name: string;
}

/**
 * Office information
 */
export interface OfficeInfo {
  name: string;
  city: string;
  state: string;
}

/**
 * Location email lookup result
 */
export interface LocationEmailResult {
  email: string;
  isDefault: boolean;
}
/**
 * Analytics to SQL 
 */
export interface AnalyticsEvent {
  eventType: string;
  page: string;
  component: string;
  value?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Location suggestions
 */
export interface LocationSuggestion {
  label: string;
  value: string;
  type: 'address' | 'city' | 'state' | 'zipcode';
}


export interface CreateInterTalentRequestInput {
  portalSource: string;
  strategicClientName?: string | null;

  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;

  company?: string | null;
  property?: string | null;
  location?: string | null;
  zipCode?: string | null;

  associateId?: string | null;
  associateName?: string | null;

  jobType?: string | null;
  shiftDetails?: string | null;
  startDate?: string | null;
  notes?: string | null;

  assignedOffice?: string | null;
  distributionList?: string | null;
}

export interface CreateInterTalentRequestResult {
  requestId: string;
  status: string;
}

export interface CreateInterTalentRequestEventInput {
  requestId: string;
  eventType:
    | 'Request Created'
    | 'Routing Completed'
    | 'Internal Notification Sent'
    | 'After-Hours Customer Message Sent'
    | 'Ownership Accepted'
    | 'Duplicate Ownership Attempt'
    | 'Reminder Sent'
    | 'Escalation Sent'
    | 'Request Closed'
    | 'Routing Exception';

  performedByName?: string | null;
  performedByEmail?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ApplyInterTalentRoutingInput {
  requestId: string;

  officeName: string;
}

export interface ApplyInterTalentRoutingResult {

    assignedOffice: string;

    division: string;

    region: string;

    distributionList: string;

    officeIsOpen: boolean;

    nextOfficeOpenDateTime?: Date | null;

    status: string;

}


export interface OfficeRoutingInfo {
  Id: number;
  OfficeName: string;
  Division: string;
  Region: string;
  NotificationEmails: string;
  ZipCode: string;
  Latitude: number;
  Longitude: number;
  RadiusMiles: number;
  IsActive: boolean;
}

export interface OfficeRoutingResult {
  officeId: number;
  officeName: string;
  officeEmail: string;
  division: string;
  region: string;

  distanceMiles: number;
}
/**
 * Database Interface
 * All database implementations must conform to this interface
 */
export interface IDatabase {
  // Profile operations
  getAllProfiles(
    page?: number,
    limit?: number,
    sortBy?: 'name' | 'location' | 'profession',
    sortDirection?: 'asc' | 'desc'
  ): Promise<PaginatedProfiles>;
  getProfileById(id: string): Promise<Profile | null>;
  searchProfiles(params: ProfileSearchParams): Promise<PaginatedProfiles>;

  // Metadata operations
  getProfessionTypes(): Promise<string[]>;
  getStates(): Promise<StateInfo[]>;
  getOffices(): Promise<OfficeInfo[]>;
  getClients(): Promise<string[]>;
  getAds(): Promise<Ad[]>;

  createAd(data: {
    title: string;

    imageData: number[];
    imageMimeType: string;

    destinationUrl: string;
    displayOrder: number;
    isActive: boolean;
    targetAccounts: string[];
  }): Promise<void>;

  deleteAd(id: number): Promise<void>;
  
  updateAd(id: number, data: Partial<{
    title: string;
    imageData: number[];
    imageMimeType: string;
    destinationUrl: string;
    displayOrder: number;
    isActive: boolean;
    targetAccounts: string[];
  }>): Promise<void>; 

  getLocationEmail(location: string): Promise<LocationEmailResult>;
  getLocationSuggestion(
    query: string
  ): Promise<LocationSuggestion[]>;
  getOfficeRoutingData(): Promise<OfficeRoutingInfo[]>;

  getCachedLocationSuggestions(
    query: string
  ): Promise<LocationSuggestion[]>;

  saveLocationSuggestions(
    query: string,
    suggestions: LocationSuggestion[]
  ): Promise<void>;

  createInterTalentRequest(
    data: CreateInterTalentRequestInput
  ): Promise<CreateInterTalentRequestResult>;

  createRequestEvent(
    data: CreateInterTalentRequestEventInput
  ): Promise<void>;

  applyInterTalentRouting(
      data: ApplyInterTalentRoutingInput
  ): Promise<void>;

  createStaffingRequest(data: {
    officeId: number;
    officeName: string;
    officeEmail: string;

    managementCompany?: string;
    propertyName?: string;
    streetAddress?: string;
    city?: string;
    state?: string;

    positionType?: string;
    positionTitle?: string;
    duties?: string;
    startDate?: string;
    schedule?: string;

    contactTitle?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;

    contactMethod?: string;
    bestTimeToRespond?: string;
  }): Promise<void>;

  // Analytics
  insertAnalyticsEvent(
    event: AnalyticsEvent
  ): Promise<void>;

  // Profile mutations (for sync service)
  insertProfiles(profiles: Profile[]): Promise<void>;
  updateProfile(id: string, data: Partial<Profile>): Promise<void>;
  deleteProfiles(ids: string[]): Promise<void>;
  insertTalentRequest(data: {
    name: string;
    email: string;
    phone?: string;
    notes: string;
    location?: string;
    personId?: string;
    associateId?: string;
    associateName?: string;
    startDate?: string;
    startTime?: string;
    endTime?: string;
    requestMode?: string;
    campaign?: string;
    customerName?: string;
    strategicAccount?: string | null;
    propertyName?: string | null;
  }): Promise<void>;
}

