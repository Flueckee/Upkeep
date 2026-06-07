export type BikeType = 'road' | 'gravel' | 'mtb' | 'other';
export type ComponentCategory = 'brakes' | 'drivetrain' | 'wheels' | 'suspension' | 'other';
export type IntervalType = 'time' | 'distance' | 'both';
export type DueStatus = 'needs_first_service' | 'due_soon' | 'overdue';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  primary_color: string | null;
  created_at: string;
}

export interface Bike {
  id: string;
  user_id: string;
  name: string;
  type: BikeType;
  brand: string | null;
  model: string | null;
  year: number | null;
  total_km: number;
  photo_url: string | null;
  created_at: string;
}

export interface ServiceInterval {
  id: string;
  component_id: string;
  interval_type: IntervalType;
  interval_days: number | null;
  interval_km: number | null;
  reminder_days_before: number;
}

export interface Component {
  id: string;
  bike_id: string;
  name: string;
  category: ComponentCategory;
  is_preset: boolean;
  installed_at: string | null;
  installed_km: number | null;
  notes: string | null;
  purchase_url: string | null;
  service_interval: ServiceInterval | null;
}

export interface MaintenanceLog {
  id: string;
  component_id: string;
  performed_at: string;
  /** Set server-side at insert; never editable. */
  recorded_at: string;
  odometer_km: number;
  description: string;
  cost: number | null;
  created_at: string;
}

export interface ComponentDue {
  id: string;
  name: string;
  category: ComponentCategory;
  status: DueStatus;
  days_since_service: number | null;
  days_until_due: number | null;
  km_since_service: number | null;
  km_until_due: number | null;
  service_interval: ServiceInterval;
}

export interface MaintenancePhoto {
  id: string;
  log_id: string;
  file_url: string;
  thumbnail_url: string;
  uploaded_at: string;
  caption: string | null;
}

export interface MaintenanceComment {
  id: string;
  log_id: string;
  text: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface StravaStatus {
  connected: boolean;
  athlete_id: number | null;
  default_bike_id: string | null;
  last_backfill_at: string | null;
}

export interface StravaGearItem {
  gear_id: string;
  name: string;
  distance_km: number;
  /** Currently mapped Upkeep bike, if any. */
  bike_id: string | null;
  /** Gear is explicitly excluded from import. */
  ignored: boolean;
}
