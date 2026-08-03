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
      agencies: {
        Row: {
          archived: boolean
          base_rate_pence: number
          created_at: string
          id: string
          name: string
          notes: string | null
          pay_cycle: string
          pay_delay_days: number
          pay_week_start_day: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          base_rate_pence: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          pay_cycle?: string
          pay_delay_days?: number
          pay_week_start_day?: number
          user_id?: string
        }
        Update: {
          archived?: boolean
          base_rate_pence?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          pay_cycle?: string
          pay_delay_days?: number
          pay_week_start_day?: number
          user_id?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          agency_id: string
          created_at: string
          gross_pence: number
          id: string
          net_pence: number | null
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          gross_pence: number
          id?: string
          net_pence?: number | null
          period_end: string
          period_start: string
          user_id?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          gross_pence?: number
          id?: string
          net_pence?: number | null
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          holiday_accrual_pct: number
          id: string
          show_holiday_accrual: boolean
          username: string | null
          week_starts_on: number
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          holiday_accrual_pct?: number
          id: string
          show_holiday_accrual?: boolean
          username?: string | null
          week_starts_on?: number
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          holiday_accrual_pct?: number
          id?: string
          show_holiday_accrual?: boolean
          username?: string | null
          week_starts_on?: number
        }
        Relationships: []
      }
      rate_rules: {
        Row: {
          active: boolean
          agency_id: string
          band_end: string | null
          band_start: string | null
          created_at: string
          days_of_week: number[] | null
          id: string
          kind: string
          label: string
          multiplier: number | null
          priority: number
          rate_pence: number | null
          threshold_minutes: number | null
          threshold_scope: string | null
        }
        Insert: {
          active?: boolean
          agency_id: string
          band_end?: string | null
          band_start?: string | null
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          kind: string
          label: string
          multiplier?: number | null
          priority?: number
          rate_pence?: number | null
          threshold_minutes?: number | null
          threshold_scope?: string | null
        }
        Update: {
          active?: boolean
          agency_id?: string
          band_end?: string | null
          band_start?: string | null
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          kind?: string
          label?: string
          multiplier?: number | null
          priority?: number
          rate_pence?: number | null
          threshold_minutes?: number | null
          threshold_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_rules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          agency_id: string
          break_minutes: number
          breaks: Json
          created_at: string
          date: string
          end_time: string
          id: string
          manual_rate_pence: number | null
          notes: string | null
          start_time: string
          user_id: string
        }
        Insert: {
          agency_id: string
          break_minutes?: number
          breaks?: Json
          created_at?: string
          date: string
          end_time: string
          id?: string
          manual_rate_pence?: number | null
          notes?: string | null
          start_time: string
          user_id?: string
        }
        Update: {
          agency_id?: string
          break_minutes?: number
          breaks?: Json
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          manual_rate_pence?: number | null
          notes?: string | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      username_available: { Args: { p_username: string }; Returns: boolean }
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
