export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_documents: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          team_id: string
        }
        Insert: {
          announcement_id: string
          team_id: string
        }
        Update: {
          announcement_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          created_at: string
          id: string
          program_id: string
          student_id: string
          team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          student_id: string
          team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          student_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          is_general: boolean
          name: string
          sort: number
        }
        Insert: {
          created_at?: string
          is_general?: boolean
          name: string
          sort?: number
        }
        Update: {
          created_at?: string
          is_general?: boolean
          name?: string
          sort?: number
        }
        Relationships: []
      }
      category_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      category_limits: {
        Row: {
          arts_max: number
          arts_min: number
          category: string
          group_limit: number
          min_items: string[]
          min_total: number
          nonstage_limit: number
          nonstage_min: number
          nonstage_unlimited: boolean
          sports_limit: number
          sports_unlimited: boolean
          stage_limit: number
          stage_min: number
          stage_unlimited: boolean
        }
        Insert: {
          arts_max?: number
          arts_min?: number
          category: string
          group_limit?: number
          min_items?: string[]
          min_total?: number
          nonstage_limit?: number
          nonstage_min?: number
          nonstage_unlimited?: boolean
          sports_limit?: number
          sports_unlimited?: boolean
          stage_limit?: number
          stage_min?: number
          stage_unlimited?: boolean
        }
        Update: {
          arts_max?: number
          arts_min?: number
          category?: string
          group_limit?: number
          min_items?: string[]
          min_total?: number
          nonstage_limit?: number
          nonstage_min?: number
          nonstage_unlimited?: boolean
          sports_limit?: number
          sports_unlimited?: boolean
          stage_limit?: number
          stage_min?: number
          stage_unlimited?: boolean
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          remarks: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          remarks?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          remarks?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      fest_settings: {
        Row: {
          about_text: string | null
          contact_address: string | null
          contact_email: string | null
          contact_map_url: string | null
          contact_phone: string | null
          entry_open: boolean
          fest_name: string
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          live_enabled: boolean
          logo_url: string | null
          main_hidden: boolean
          maintenance_message: string | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_map_url?: string | null
          contact_phone?: string | null
          entry_open?: boolean
          fest_name?: string
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          live_enabled?: boolean
          logo_url?: string | null
          main_hidden?: boolean
          maintenance_message?: string | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_map_url?: string | null
          contact_phone?: string | null
          entry_open?: boolean
          fest_name?: string
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          live_enabled?: boolean
          logo_url?: string | null
          main_hidden?: boolean
          maintenance_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gallery: {
        Row: {
          album: string | null
          caption: string | null
          created_at: string
          id: string
          image_url: string
          mobile_image_url: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          album?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          mobile_image_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          album?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          mobile_image_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      grading_schemes: {
        Row: {
          code: string
          created_at: string
          grade_a_percent: number
          grade_a_points: number
          grade_b_percent: number
          grade_b_points: number
          grade_c_percent: number
          grade_c_points: number
          grade_count: number
          id: string
          name: string
          pos1_points: number
          pos2_points: number
          pos3_points: number
        }
        Insert: {
          code: string
          created_at?: string
          grade_a_percent?: number
          grade_a_points?: number
          grade_b_percent?: number
          grade_b_points?: number
          grade_c_percent?: number
          grade_c_points?: number
          grade_count?: number
          id?: string
          name: string
          pos1_points?: number
          pos2_points?: number
          pos3_points?: number
        }
        Update: {
          code?: string
          created_at?: string
          grade_a_percent?: number
          grade_a_points?: number
          grade_b_percent?: number
          grade_b_points?: number
          grade_c_percent?: number
          grade_c_points?: number
          grade_count?: number
          id?: string
          name?: string
          pos1_points?: number
          pos2_points?: number
          pos3_points?: number
        }
        Relationships: []
      }
      live_reveals: {
        Row: {
          program_id: string
          show_details: boolean
          show_first: boolean
          show_others: boolean
        }
        Insert: {
          program_id: string
          show_details?: boolean
          show_first?: boolean
          show_others?: boolean
        }
        Update: {
          program_id?: string
          show_details?: boolean
          show_first?: boolean
          show_others?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "live_reveals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      mark_settings: {
        Row: {
          grade_a_percent: number
          grade_a_points: number
          grade_b_percent: number
          grade_b_points: number
          grade_c_percent: number
          grade_c_points: number
          id: number
          pos1_points: number
          pos2_points: number
          pos3_points: number
        }
        Insert: {
          grade_a_percent?: number
          grade_a_points?: number
          grade_b_percent?: number
          grade_b_points?: number
          grade_c_percent?: number
          grade_c_points?: number
          id?: number
          pos1_points?: number
          pos2_points?: number
          pos3_points?: number
        }
        Update: {
          grade_a_percent?: number
          grade_a_points?: number
          grade_b_percent?: number
          grade_b_points?: number
          grade_c_percent?: number
          grade_c_points?: number
          id?: number
          pos1_points?: number
          pos2_points?: number
          pos3_points?: number
        }
        Relationships: []
      }
      program_mark_config: {
        Row: {
          columns: number
          grade_a_percent: number | null
          grade_b_percent: number | null
          grade_c_percent: number | null
          program_id: string
        }
        Insert: {
          columns?: number
          grade_a_percent?: number | null
          grade_b_percent?: number | null
          grade_c_percent?: number | null
          program_id: string
        }
        Update: {
          columns?: number
          grade_a_percent?: number | null
          grade_b_percent?: number | null
          grade_c_percent?: number | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_mark_config_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_registration: {
        Row: {
          created_at: string
          deadline: string | null
          is_open: boolean
          max_entries: number
          program_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          is_open?: boolean
          max_entries?: number
          program_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          is_open?: boolean
          max_entries?: number
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_registration_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          allowed_classes: string | null
          candidates: number
          category: string
          code: string
          created_at: string
          entry_mode: string
          grading_scheme_id: string | null
          group_count: number
          group_size: number
          id: string
          name: string
          status: string
          type: string
        }
        Insert: {
          allowed_classes?: string | null
          candidates?: number
          category: string
          code: string
          created_at?: string
          entry_mode?: string
          grading_scheme_id?: string | null
          group_count?: number
          group_size?: number
          id?: string
          name: string
          status?: string
          type: string
        }
        Update: {
          allowed_classes?: string | null
          candidates?: number
          category?: string
          code?: string
          created_at?: string
          entry_mode?: string
          grading_scheme_id?: string | null
          group_count?: number
          group_size?: number
          id?: string
          name?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_grading_scheme_id_fkey"
            columns: ["grading_scheme_id"]
            isOneToOne: false
            referencedRelation: "grading_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          link: string | null
          program_id: string
          remark: string | null
          reviewed_at: string | null
          seen_by_team: boolean
          status: string
          team_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          link?: string | null
          program_id: string
          remark?: string | null
          reviewed_at?: string | null
          seen_by_team?: boolean
          status?: string
          team_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          link?: string | null
          program_id?: string
          remark?: string | null
          reviewed_at?: string | null
          seen_by_team?: boolean
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      result_entries: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          is_group: boolean
          manual_override: boolean
          mark1: number | null
          mark2: number | null
          max_total: number
          percent: number
          points: number
          position: number | null
          program_id: string
          published_at: string | null
          status: string
          student_id: string | null
          team_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          is_group?: boolean
          manual_override?: boolean
          mark1?: number | null
          mark2?: number | null
          max_total?: number
          percent?: number
          points?: number
          position?: number | null
          program_id: string
          published_at?: string | null
          status?: string
          student_id?: string | null
          team_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          is_group?: boolean
          manual_override?: boolean
          mark1?: number | null
          mark2?: number | null
          max_total?: number
          percent?: number
          points?: number
          position?: number | null
          program_id?: string
          published_at?: string | null
          status?: string
          student_id?: string | null
          team_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_entries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          adno: string | null
          category: string | null
          created_at: string
          grade: string | null
          id: string
          points: number
          position: number | null
          program_code: string
          program_id: string | null
          program_name: string | null
          published: boolean
          student_name: string | null
          team_id: string | null
          team_name: string | null
          type: string | null
        }
        Insert: {
          adno?: string | null
          category?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          points?: number
          position?: number | null
          program_code: string
          program_id?: string | null
          program_name?: string | null
          published?: boolean
          student_name?: string | null
          team_id?: string | null
          team_name?: string | null
          type?: string | null
        }
        Update: {
          adno?: string | null
          category?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          points?: number
          position?: number | null
          program_code?: string
          program_id?: string | null
          program_name?: string | null
          published?: boolean
          student_name?: string | null
          team_id?: string | null
          team_name?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          adno: string
          category: string | null
          class: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          team_id: string | null
        }
        Insert: {
          adno: string
          category?: string | null
          class?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          team_id?: string | null
        }
        Update: {
          adno?: string
          category?: string | null
          class?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_sessions: {
        Row: {
          created_at: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams_public"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain: string | null
          created_at: string
          id: string
          name: string
          password_hash: string
          short_name: string | null
          username: string
          vice_captain: string | null
          vice_captain2: string | null
        }
        Insert: {
          captain?: string | null
          created_at?: string
          id?: string
          name: string
          password_hash: string
          short_name?: string | null
          username: string
          vice_captain?: string | null
          vice_captain2?: string | null
        }
        Update: {
          captain?: string | null
          created_at?: string
          id?: string
          name?: string
          password_hash?: string
          short_name?: string | null
          username?: string
          vice_captain?: string | null
          vice_captain2?: string | null
        }
        Relationships: []
      }
      timetable: {
        Row: {
          completed: boolean
          created_at: string
          end_time: string | null
          event_date: string
          event_time: string | null
          id: string
          program_id: string
          stage: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          end_time?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          program_id: string
          stage?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          program_id?: string
          stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      teams_public: {
        Row: {
          captain: string | null
          id: string | null
          name: string | null
          short_name: string | null
          vice_captain: string | null
          vice_captain2: string | null
        }
        Insert: {
          captain?: string | null
          id?: string | null
          name?: string | null
          short_name?: string | null
          vice_captain?: string | null
          vice_captain2?: string | null
        }
        Update: {
          captain?: string | null
          id?: string | null
          name?: string | null
          short_name?: string | null
          vice_captain?: string | null
          vice_captain2?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approved_registrations: {
        Args: never
        Returns: {
          allowed_classes: string
          candidates: number
          category: string
          created_at: string
          id: string
          link: string
          program_code: string
          program_name: string
          remark: string
          type: string
        }[]
      }
      hash_password: { Args: { p_password: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      live_results: {
        Args: never
        Returns: {
          adno: string
          category: string
          grade: string
          id: string
          is_group: boolean
          max_total: number
          percent: number
          photo_url: string
          points: number
          position: number
          program_code: string
          program_id: string
          program_name: string
          published_at: string
          status: string
          student_name: string
          team_id: string
          team_name: string
          team_short: string
          total: number
          type: string
          updated_at: string
        }[]
      }
      published_results: {
        Args: never
        Returns: {
          adno: string
          category: string
          grade: string
          id: string
          is_group: boolean
          max_total: number
          percent: number
          photo_url: string
          points: number
          position: number
          program_code: string
          program_id: string
          program_name: string
          published_at: string
          status: string
          student_name: string
          team_id: string
          team_name: string
          team_short: string
          total: number
          type: string
          updated_at: string
        }[]
      }
      recalc_all_results: { Args: never; Returns: undefined }
      recalc_program_results: {
        Args: { p_program_id: string }
        Returns: undefined
      }
      team_assign: {
        Args: { p_adno: string; p_program_code: string; p_token: string }
        Returns: Json
      }
      team_assignments: { Args: { p_token: string }; Returns: Json }
      team_login: {
        Args: { p_password: string; p_username: string }
        Returns: Json
      }
      team_logout: { Args: { p_token: string }; Returns: undefined }
      team_mark_read: {
        Args: { p_announcement_id: string; p_token: string }
        Returns: undefined
      }
      team_mark_registrations_seen: {
        Args: { p_token: string }
        Returns: undefined
      }
      team_of: { Args: { p_token: string }; Returns: string }
      team_open_registrations: { Args: { p_token: string }; Returns: Json }
      team_register: {
        Args: {
          p_link?: string
          p_program_code: string
          p_remark?: string
          p_token: string
        }
        Returns: Json
      }
      team_registrations: { Args: { p_token: string }; Returns: Json }
      team_results: { Args: { p_token: string }; Returns: Json }
      team_students: { Args: { p_token: string }; Returns: Json }
      team_unassign: {
        Args: { p_assignment_id: string; p_token: string }
        Returns: undefined
      }
      team_unread: { Args: { p_token: string }; Returns: Json }
      team_unregister: {
        Args: { p_registration_id: string; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
