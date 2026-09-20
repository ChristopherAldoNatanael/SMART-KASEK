export type UserRole = "admin" | "principal" | "teacher";

export type SupervisionStatus = "draft" | "completed" | "follow_up" | "closed";

export type CompetencySource =
  | "supervision"
  | "self_assessment"
  | "coaching"
  | "assessment"
  | "manual"
  | "ai";

export type CoachingActionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type GoodPracticeStatus = "draft" | "published" | "archived";

export type AIFeatureType =
  | "assistant"
  | "coach"
  | "school_insight"
  | "early_warning";

export type AIInsightType =
  | "teacher_growth"
  | "school_performance"
  | "supervision"
  | "coaching"
  | "risk";

export type WarningSeverity = "low" | "medium" | "high" | "critical";

export type WarningStatus = "active" | "acknowledged" | "resolved" | "dismissed";

export type StudentGender = "male" | "female";

export type StudentStatus = "active" | "graduated" | "transferred" | "dropped";

export type ProgramStatus = "planned" | "ongoing" | "completed" | "cancelled";

export type LetterType = "incoming" | "outgoing";

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          npsn: string | null;
          address: string | null;
          village: string | null;
          district: string | null;
          city: string | null;
          province: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          logo_size: number | null;
          principal_name: string | null;
          principal_nip: string | null;
          invite_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          npsn?: string | null;
          address?: string | null;
          village?: string | null;
          district?: string | null;
          city?: string | null;
          province?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          logo_size?: number | null;
          principal_name?: string | null;
          principal_nip?: string | null;
          invite_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          npsn?: string | null;
          address?: string | null;
          village?: string | null;
          district?: string | null;
          city?: string | null;
          province?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          logo_size?: number | null;
          principal_name?: string | null;
          principal_nip?: string | null;
          invite_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          school_id: string;
          full_name: string;
          email: string;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          school_id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          school_id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          profile_id: string | null;
          school_id: string;
          employee_number: string | null;
          nip: string | null;
          subject: string | null;
          homeroom_class: string | null;
          department: string | null;
          education_level: string | null;
          employment_status: string;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          school_id: string;
          employee_number?: string | null;
          nip?: string | null;
          subject?: string | null;
          homeroom_class?: string | null;
          department?: string | null;
          education_level?: string | null;
          employment_status?: string;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          school_id?: string;
          employee_number?: string | null;
          nip?: string | null;
          subject?: string | null;
          homeroom_class?: string | null;
          department?: string | null;
          education_level?: string | null;
          employment_status?: string;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      competencies: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          weight: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          weight?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          weight?: number;
          is_active?: boolean;
        };
      };
      teacher_competencies: {
        Row: {
          id: string;
          teacher_id: string;
          competency_id: string;
          score: number;
          source: CompetencySource;
          assessed_by: string | null;
          assessed_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          competency_id: string;
          score: number;
          source?: CompetencySource;
          assessed_by?: string | null;
          assessed_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          competency_id?: string;
          score?: number;
          source?: CompetencySource;
          assessed_by?: string | null;
          assessed_at?: string;
          notes?: string | null;
        };
      };
      supervisions: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          supervisor_id: string | null;
          supervision_date: string;
          type: string | null;
          kind: string;
          academic_year: string | null;
          period: string | null;
          overall_score: number | null;
          summary: string | null;
          strengths: string | null;
          improvements: string | null;
          status: SupervisionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id: string;
          supervisor_id?: string | null;
          supervision_date: string;
          type?: string | null;
          kind?: string;
          academic_year?: string | null;
          period?: string | null;
          overall_score?: number | null;
          summary?: string | null;
          strengths?: string | null;
          improvements?: string | null;
          status?: SupervisionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string;
          supervisor_id?: string | null;
          supervision_date?: string;
          type?: string | null;
          kind?: string;
          academic_year?: string | null;
          period?: string | null;
          overall_score?: number | null;
          summary?: string | null;
          strengths?: string | null;
          improvements?: string | null;
          status?: SupervisionStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      supervision_managerial_assessments: {
        Row: {
          id: string;
          supervision_id: string;
          evaluator_id: string | null;
          i1_total: number;
          i1_value: number;
          i1_status: string;
          i2_present: number;
          i2_value: number;
          i2_status: string;
          i3_total: number;
          i3_value: number;
          i3_status: string;
          overall_value: number | null;
          grade: string;
          findings: string | null;
          supervisor_notes: string | null;
          follow_up_recommendation: string | null;
          improvement_target: string | null;
          follow_up_status: string;
          status: string;
          finalized_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supervision_id: string;
          evaluator_id?: string | null;
          i1_total?: number;
          i1_value?: number;
          i1_status?: string;
          i2_present?: number;
          i2_value?: number;
          i2_status?: string;
          i3_total?: number;
          i3_value?: number;
          i3_status?: string;
          overall_value?: number | null;
          grade?: string;
          findings?: string | null;
          supervisor_notes?: string | null;
          follow_up_recommendation?: string | null;
          improvement_target?: string | null;
          follow_up_status?: string;
          status?: string;
          finalized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supervision_id?: string;
          evaluator_id?: string | null;
          i1_total?: number;
          i1_value?: number;
          i1_status?: string;
          i2_present?: number;
          i2_value?: number;
          i2_status?: string;
          i3_total?: number;
          i3_value?: number;
          i3_status?: string;
          overall_value?: number | null;
          grade?: string;
          findings?: string | null;
          supervisor_notes?: string | null;
          follow_up_recommendation?: string | null;
          improvement_target?: string | null;
          follow_up_status?: string;
          status?: string;
          finalized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      supervision_managerial_items: {
        Row: {
          id: string;
          assessment_id: string;
          instrument: string;
          item_key: string;
          score: number | null;
          present: boolean | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          instrument: string;
          item_key: string;
          score?: number | null;
          present?: boolean | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          instrument?: string;
          item_key?: string;
          score?: number | null;
          present?: boolean | null;
          note?: string | null;
          created_at?: string;
        };
      };
      supervision_items: {
        Row: {
          id: string;
          supervision_id: string;
          indicator: string;
          category: string | null;
          score: number | null;
          observation: string | null;
          recommendation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          supervision_id: string;
          indicator: string;
          category?: string | null;
          score?: number | null;
          observation?: string | null;
          recommendation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          supervision_id?: string;
          indicator?: string;
          category?: string | null;
          score?: number | null;
          observation?: string | null;
          recommendation?: string | null;
          created_at?: string;
        };
      };
      supervision_documents: {
        Row: {
          id: string;
          supervision_id: string;
          doc_type: string;
          file_path: string;
          original_name: string;
          mime_type: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          supervision_id: string;
          doc_type: string;
          file_path: string;
          original_name: string;
          mime_type: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          supervision_id?: string;
          doc_type?: string;
          file_path?: string;
          original_name?: string;
          mime_type?: string;
          file_size?: number;
          created_at?: string;
        };
      };
      supervision_instrument_assessments: {
        Row: {
          id: string;
          supervision_id: string;
          class_name: string | null;
          evaluator_id: string | null;
          total_score: number;
          final_value: number;
          grade: string;
          evaluation: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supervision_id: string;
          class_name?: string | null;
          evaluator_id?: string | null;
          total_score?: number;
          final_value?: number;
          grade?: string;
          evaluation?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supervision_id?: string;
          class_name?: string | null;
          evaluator_id?: string | null;
          total_score?: number;
          final_value?: number;
          grade?: string;
          evaluation?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      supervision_instrument_items: {
        Row: {
          id: string;
          assessment_id: string;
          doc_type: string;
          present: boolean;
          score: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          doc_type: string;
          present?: boolean;
          score?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          doc_type?: string;
          present?: boolean;
          score?: number | null;
          note?: string | null;
          created_at?: string;
        };
      };
      coaching_sessions: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          coach_id: string | null;
          supervision_id: string | null;
          session_date: string;
          focus_area: string | null;
          initial_condition: string | null;
          discussion: string | null;
          agreement: string | null;
          summary: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id: string;
          coach_id?: string | null;
          supervision_id?: string | null;
          session_date: string;
          focus_area?: string | null;
          initial_condition?: string | null;
          discussion?: string | null;
          agreement?: string | null;
          summary?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string;
          coach_id?: string | null;
          supervision_id?: string | null;
          session_date?: string;
          focus_area?: string | null;
          initial_condition?: string | null;
          discussion?: string | null;
          agreement?: string | null;
          summary?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      coaching_actions: {
        Row: {
          id: string;
          coaching_session_id: string;
          action: string;
          target_date: string | null;
          completed_date: string | null;
          status: CoachingActionStatus;
          evidence: string | null;
          result: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coaching_session_id: string;
          action: string;
          target_date?: string | null;
          completed_date?: string | null;
          status?: CoachingActionStatus;
          evidence?: string | null;
          result?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coaching_session_id?: string;
          action?: string;
          target_date?: string | null;
          completed_date?: string | null;
          status?: CoachingActionStatus;
          evidence?: string | null;
          result?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teacher_growth_snapshots: {
        Row: {
          id: string;
          teacher_id: string;
          period: string;
          overall_score: number | null;
          pedagogic_score: number | null;
          professional_score: number | null;
          social_score: number | null;
          personality_score: number | null;
          digital_score: number | null;
          assessment_score: number | null;
          classroom_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          period: string;
          overall_score?: number | null;
          pedagogic_score?: number | null;
          professional_score?: number | null;
          social_score?: number | null;
          personality_score?: number | null;
          digital_score?: number | null;
          assessment_score?: number | null;
          classroom_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          period?: string;
          overall_score?: number | null;
          pedagogic_score?: number | null;
          professional_score?: number | null;
          social_score?: number | null;
          personality_score?: number | null;
          digital_score?: number | null;
          assessment_score?: number | null;
          classroom_score?: number | null;
          created_at?: string;
        };
      };
      lesson_plans: {
        Row: {
          id: string;
          teacher_id: string;
          title: string;
          subject: string | null;
          class_name: string | null;
          semester: string | null;
          description: string | null;
          file_url: string | null;
          doc_url: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          title: string;
          subject?: string | null;
          class_name?: string | null;
          semester?: string | null;
          description?: string | null;
          file_url?: string | null;
          doc_url?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          title?: string;
          subject?: string | null;
          class_name?: string | null;
          semester?: string | null;
          description?: string | null;
          file_url?: string | null;
          doc_url?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      teaching_journals: {
        Row: {
          id: string;
          teacher_id: string;
          date: string;
          subject: string | null;
          class_name: string | null;
          topic: string | null;
          activity: string | null;
          reflection: string | null;
          obstacles: string | null;
          next_action: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          date: string;
          subject?: string | null;
          class_name?: string | null;
          topic?: string | null;
          activity?: string | null;
          reflection?: string | null;
          obstacles?: string | null;
          next_action?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          date?: string;
          subject?: string | null;
          class_name?: string | null;
          topic?: string | null;
          activity?: string | null;
          reflection?: string | null;
          obstacles?: string | null;
          next_action?: string | null;
          created_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          teacher_id: string;
          subject: string | null;
          class_name: string | null;
          assessment_type: string | null;
          assessment_date: string | null;
          average_score: number | null;
          completion_rate: number | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject?: string | null;
          class_name?: string | null;
          assessment_type?: string | null;
          assessment_date?: string | null;
          average_score?: number | null;
          completion_rate?: number | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          subject?: string | null;
          class_name?: string | null;
          assessment_type?: string | null;
          assessment_date?: string | null;
          average_score?: number | null;
          completion_rate?: number | null;
          description?: string | null;
          created_at?: string;
        };
      };
      good_practices: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string | null;
          title: string;
          category: string | null;
          problem: string | null;
          strategy: string | null;
          implementation: string | null;
          result: string | null;
          description: string | null;
          cover_url: string | null;
          status: GoodPracticeStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id?: string | null;
          title: string;
          category?: string | null;
          problem?: string | null;
          strategy?: string | null;
          implementation?: string | null;
          result?: string | null;
          description?: string | null;
          cover_url?: string | null;
          status?: GoodPracticeStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string | null;
          title?: string;
          category?: string | null;
          problem?: string | null;
          strategy?: string | null;
          implementation?: string | null;
          result?: string | null;
          description?: string | null;
          cover_url?: string | null;
          status?: GoodPracticeStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      good_practice_comments: {
        Row: {
          id: string;
          good_practice_id: string;
          user_id: string | null;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          good_practice_id: string;
          user_id?: string | null;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          good_practice_id?: string;
          user_id?: string | null;
          comment?: string;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          student_number: string | null;
          no_induk: string | null;
          full_name: string;
          class_name: string | null;
          gender: StudentGender | null;
          religion: string | null;
          status: StudentStatus;
          academic_year: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_number?: string | null;
          no_induk?: string | null;
          full_name: string;
          class_name?: string | null;
          gender?: StudentGender | null;
          religion?: string | null;
          status?: StudentStatus;
          academic_year?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_number?: string | null;
          no_induk?: string | null;
          full_name?: string;
          class_name?: string | null;
          gender?: StudentGender | null;
          religion?: string | null;
          status?: StudentStatus;
          academic_year?: string | null;
          created_at?: string;
        };
      };
      attendance_sessions: {
        Row: {
          id: string;
          school_id: string;
          class_name: string;
          academic_year: string;
          date: string;
          label: string;
          starts_at: string;
          late_after: string | null;
          ends_at: string | null;
          status: string;
          qr_token: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_name: string;
          academic_year: string;
          date: string;
          label?: string;
          starts_at?: string;
          late_after?: string | null;
          ends_at?: string | null;
          status?: string;
          qr_token: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          class_name?: string;
          academic_year?: string;
          date?: string;
          label?: string;
          starts_at?: string;
          late_after?: string | null;
          ends_at?: string | null;
          status?: string;
          qr_token?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      class_attendance: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          class_name: string | null;
          academic_year: string | null;
          date: string;
          status: string;
          recorded_by: string | null;
          created_at: string;
          session_id: string | null;
          checked_in_at: string | null;
          check_in_method: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          class_name?: string | null;
          academic_year?: string | null;
          date: string;
          status?: string;
          recorded_by?: string | null;
          created_at?: string;
          session_id?: string | null;
          checked_in_at?: string | null;
          check_in_method?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          class_name?: string | null;
          academic_year?: string | null;
          date?: string;
          status?: string;
          recorded_by?: string | null;
          created_at?: string;
          session_id?: string | null;
          checked_in_at?: string | null;
          check_in_method?: string;
        };
      };
      school_classes: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      teaching_assignments: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string;
          class_name: string;
          subject: string;
          academic_year: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id: string;
          class_name: string;
          subject: string;
          academic_year: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string;
          class_name?: string;
          subject?: string;
          academic_year?: string;
          created_at?: string;
        };
      };
      promotion_decisions: {
        Row: {
          id: string;
          school_id: string;
          academic_year: string;
          class_name: string;
          student_id: string;
          homeroom_teacher_id: string | null;
          recommendation: string | null;
          recommendation_note: string | null;
          recommended_by: string | null;
          recommended_at: string | null;
          final_decision: string | null;
          principal_note: string | null;
          decided_by: string | null;
          decided_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year: string;
          class_name: string;
          student_id: string;
          homeroom_teacher_id?: string | null;
          recommendation?: string | null;
          recommendation_note?: string | null;
          recommended_by?: string | null;
          recommended_at?: string | null;
          final_decision?: string | null;
          principal_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year?: string;
          class_name?: string;
          student_id?: string;
          homeroom_teacher_id?: string | null;
          recommendation?: string | null;
          recommendation_note?: string | null;
          recommended_by?: string | null;
          recommended_at?: string | null;
          final_decision?: string | null;
          principal_note?: string | null;
          decided_by?: string | null;
          decided_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_indicators: {
        Row: {
          id: string;
          student_id: string;
          indicator: string;
          value: number | null;
          period: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          indicator: string;
          value?: number | null;
          period?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          indicator?: string;
          value?: number | null;
          period?: string | null;
          source?: string | null;
          created_at?: string;
        };
      };
      programs: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          category: string | null;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          status: ProgramStatus;
          budget: number | null;
          responsible_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          category?: string | null;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: ProgramStatus;
          budget?: number | null;
          responsible_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          category?: string | null;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: ProgramStatus;
          budget?: number | null;
          responsible_user_id?: string | null;
          created_at?: string;
        };
      };
      letters: {
        Row: {
          id: string;
          school_id: string;
          number: string | null;
          type: LetterType;
          subject: string | null;
          date: string | null;
          file_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          number?: string | null;
          type?: LetterType;
          subject?: string | null;
          date?: string | null;
          file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          number?: string | null;
          type?: LetterType;
          subject?: string | null;
          date?: string | null;
          file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      decisions: {
        Row: {
          id: string;
          school_id: string;
          number: string | null;
          title: string;
          date: string | null;
          description: string | null;
          file_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          number?: string | null;
          title: string;
          date?: string | null;
          description?: string | null;
          file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          number?: string | null;
          title?: string;
          date?: string | null;
          description?: string | null;
          file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      meeting_minutes: {
        Row: {
          id: string;
          school_id: string;
          meeting_date: string;
          title: string;
          participants: string | null;
          summary: string | null;
          decisions: string | null;
          action_items: string | null;
          file_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          meeting_date: string;
          title: string;
          participants?: string | null;
          summary?: string | null;
          decisions?: string | null;
          action_items?: string | null;
          file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          meeting_date?: string;
          title?: string;
          participants?: string | null;
          summary?: string | null;
          decisions?: string | null;
          action_items?: string | null;
          file_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      ai_interactions: {
        Row: {
          id: string;
          school_id: string;
          user_id: string | null;
          feature: AIFeatureType;
          question: string | null;
          context: Record<string, unknown> | null;
          response: Record<string, unknown> | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id?: string | null;
          feature: AIFeatureType;
          question?: string | null;
          context?: Record<string, unknown> | null;
          response?: Record<string, unknown> | null;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string | null;
          feature?: AIFeatureType;
          question?: string | null;
          context?: Record<string, unknown> | null;
          response?: Record<string, unknown> | null;
          model?: string | null;
          created_at?: string;
        };
      };
      ai_insights: {
        Row: {
          id: string;
          school_id: string;
          type: AIInsightType;
          title: string;
          content: string;
          priority: string;
          source_data: Record<string, unknown> | null;
          generated_at: string;
          expires_at: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          type: AIInsightType;
          title: string;
          content: string;
          priority?: string;
          source_data?: Record<string, unknown> | null;
          generated_at?: string;
          expires_at?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          type?: AIInsightType;
          title?: string;
          content?: string;
          priority?: string;
          source_data?: Record<string, unknown> | null;
          generated_at?: string;
          expires_at?: string | null;
          status?: string;
        };
      };
      early_warnings: {
        Row: {
          id: string;
          school_id: string;
          teacher_id: string | null;
          type: string;
          severity: WarningSeverity;
          title: string;
          description: string | null;
          evidence: Record<string, unknown> | null;
          recommendation: string | null;
          status: WarningStatus;
          detected_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          teacher_id?: string | null;
          type: string;
          severity?: WarningSeverity;
          title: string;
          description?: string | null;
          evidence?: Record<string, unknown> | null;
          recommendation?: string | null;
          status?: WarningStatus;
          detected_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          teacher_id?: string | null;
          type?: string;
          severity?: WarningSeverity;
          title?: string;
          description?: string | null;
          evidence?: Record<string, unknown> | null;
          recommendation?: string | null;
          status?: WarningStatus;
          detected_at?: string;
          resolved_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          school_id: string | null;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id?: string | null;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string | null;
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
