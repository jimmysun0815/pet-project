export interface User {
  id: number;
  email: string;
  phone?: string;
  name: string;
  role: 'customer' | 'staff' | 'admin';
}

export interface Breed {
  id: number;
  species: 'dog' | 'cat';
  name_zh: string;
  name_en: string;
  base_score: number;
  avg_weight_kg: number | null;
}

export interface Pet {
  id: number;
  name: string;
  species: 'dog' | 'cat';
  breed_id: number;
  weight_kg: number;
  age_years: number;
  base_score: number;
  breed_name_zh?: string;
  breed_name_en?: string;
  breed_avg_weight?: number;
}

export interface Appointment {
  id: number;
  pet_id: number;
  service_type: 'bath' | 'full_grooming' | 'basic_trim';
  date: string;
  slot_time: string | null;
  calculated_score: number;
  status: 'pending' | 'arrived' | 'in_progress' | 'ready_for_pickup' | 'picked_up' | 'cancelled';
  estimated_duration_minutes: number;
  notes?: string | null;
  created_at: string;
  pet_name?: string;
  breed_name?: string;
  owner_name?: string;
  owner_phone?: string;
  weight_kg?: number;
  species?: string;
  breed_name_en?: string;
}

export interface SlotInfo {
  slot_time: string;
  available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  pet_score: number;
  estimated_duration_minutes: number;
  slots: SlotInfo[];
  is_full: boolean;
}

export interface DayStats {
  date: string;
  capacity: {
    max_total_score: number;
    max_dogs: number;
    business_start: string;
    business_end: string;
  };
  used_score: number;
  used_dogs: number;
  pending_count: number;
  arrived_count?: number;
  in_progress_count: number;
  ready_count: number;
  picked_up_count: number;
  score_percentage: number;
  dogs_percentage: number;
}

export interface DateAvailability {
  date: string;
  available: boolean;
}

export interface AvailabilityRangeResponse {
  dates: DateAvailability[];
}

export interface DailyCapacity {
  id: number;
  date: string;
  max_total_score: number;
  max_dogs: number;
  business_start: string;
  business_end: string;
}
