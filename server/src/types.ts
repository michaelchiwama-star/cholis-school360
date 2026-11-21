export interface User {
  id: string;
  school_id: string;
  name: string;
  role: 'teacher' | 'professional' | 'leader' | 'admin' | 'cholis';
  username: string;
}

export interface SupportRequest {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name?: string;
  learner_ref: string;
  classroom: string;
  category: string;
  observations: string;
  status: string;
  routed_to: string | null;
  assigned_to: string | null;
  cholis_requested_at?: string | null;
  cholis_note?: string | null;
  assigned_name?: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface RequestActivity {
  id: string;
  request_id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  note: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  district: string;
  province: string;
  principal: string;
  email: string | null;
  phone: string | null;
  alliance_member: number;
  created_at: string;
}

export interface DashboardStats {
  total_requests: number;
  submitted: number;
  under_review: number;
  assigned: number;
  completed: number;
  closed: number;
  avg_response_days: number;
  parent_inquiries: number;
  cpd_activities: number;
  cpd_participants: number;
}
