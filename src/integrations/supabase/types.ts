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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      shipping_recovery_checks: {
        Row: {
          id: string
          order_id: string
          financial_revision: string
          outcome: string
          bling_order_id: number | null
          observed_at: string
        }
        // Protected append-only evidence is written through the server RPC only.
        Insert: never
        Update: never
        Relationships: [{ foreignKeyName: "shipping_recovery_checks_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "shipping_orders"; referencedColumns: ["id"] }]
      }
      shipping_hold_resolutions: {
        Row: {
          id: string
          order_id: string
          actor_id: string
          expected_revision: string
          applied_revision: string | null
          action: string
          previous_status: string
          previous_reason: string | null
          reason: string
          evidence: string
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [{ foreignKeyName: "shipping_hold_resolutions_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "shipping_orders"; referencedColumns: ["id"] }]
      }
      bling_connections: {
        Row: {
          authorized_at: string
          authorized_by: string
          encrypted_tokens: string
          expires_at: string
          id: boolean
          last_error: string | null
          refresh_lock_until: string | null
          refreshed_at: string | null
          revision: string
        }
        Insert: {
          authorized_at?: string
          authorized_by: string
          encrypted_tokens: string
          expires_at: string
          id?: boolean
          last_error?: string | null
          refresh_lock_until?: string | null
          refreshed_at?: string | null
          revision?: string
        }
        Update: {
          authorized_at?: string
          authorized_by?: string
          encrypted_tokens?: string
          expires_at?: string
          id?: boolean
          last_error?: string | null
          refresh_lock_until?: string | null
          refreshed_at?: string | null
          revision?: string
        }
        Relationships: []
      }
      bling_oauth_states: {
        Row: {
          browser_hash: string
          created_at: string
          expires_at: string
          state_hash: string
          user_id: string
        }
        Insert: {
          browser_hash: string
          created_at?: string
          expires_at: string
          state_hash: string
          user_id: string
        }
        Update: {
          browser_hash?: string
          created_at?: string
          expires_at?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      bling_store_settings: {
        Row: {
          config: Json
          id: boolean
          updated_at: string
        }
        Insert: {
          config: Json
          id?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      shipping_events: {
        Row: {
          created_at: string
          details: Json
          external_event_id: string | null
          id: string
          kind: string
          order_id: string | null
          provider: string
          state: string
        }
        Insert: {
          created_at?: string
          details?: Json
          external_event_id?: string | null
          id?: string
          kind: string
          order_id?: string | null
          provider: string
          state: string
        }
        Update: {
          created_at?: string
          details?: Json
          external_event_id?: string | null
          id?: string
          kind?: string
          order_id?: string | null
          provider?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shipping_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_orders: {
        Row: {
          appmax_check_lock_until: string | null
          appmax_payment_verified_at: string | null
          appmax_check_started_at: string | null
          appmax_next_check_at: string | null
          appmax_check_failures: number
          bling_processing_started_at: string | null
          bling_export_token: string | null
          appmax_checked_at: string | null
          appmax_status: string | null
          bling_order_id: number | null
          bling_sync_error: string | null
          bling_sync_status: string
          created_at: string
          customer_id: string | null
          delivery_address: Json | null
          discount_cents: number
          financial_revision: string
          freight_cents: number | null
          id: string
          items: Json
          label_url: string | null
          payment_link_id: string | null
          payment_status: string
          provider_payment_id: string | null
          provider_shipment_id: string | null
          quoted_cep: string | null
          shipping_service: Json | null
          shipping_status: string
          subtotal_cents: number
          tracking_code: string | null
        }
        Insert: {
          appmax_check_lock_until?: string | null
          appmax_payment_verified_at?: string | null
          appmax_check_started_at?: string | null
          appmax_next_check_at?: string | null
          appmax_check_failures?: number
          bling_processing_started_at?: string | null
          bling_export_token?: string | null
          appmax_checked_at?: string | null
          appmax_status?: string | null
          bling_order_id?: number | null
          bling_sync_error?: string | null
          bling_sync_status?: string
          created_at?: string
          customer_id?: string | null
          delivery_address?: Json | null
          discount_cents?: number
          financial_revision?: string
          freight_cents?: number | null
          id?: string
          items?: Json
          label_url?: string | null
          payment_link_id?: string | null
          payment_status?: string
          provider_payment_id?: string | null
          provider_shipment_id?: string | null
          quoted_cep?: string | null
          shipping_service?: Json | null
          shipping_status?: string
          subtotal_cents?: number
          tracking_code?: string | null
        }
        Update: {
          appmax_check_lock_until?: string | null
          appmax_payment_verified_at?: string | null
          appmax_check_started_at?: string | null
          appmax_next_check_at?: string | null
          appmax_check_failures?: number
          bling_processing_started_at?: string | null
          bling_export_token?: string | null
          appmax_checked_at?: string | null
          appmax_status?: string | null
          bling_order_id?: number | null
          bling_sync_error?: string | null
          bling_sync_status?: string
          created_at?: string
          customer_id?: string | null
          delivery_address?: Json | null
          discount_cents?: number
          financial_revision?: string
          freight_cents?: number | null
          id?: string
          items?: Json
          label_url?: string | null
          payment_link_id?: string | null
          payment_status?: string
          provider_payment_id?: string | null
          provider_shipment_id?: string | null
          quoted_cep?: string | null
          shipping_service?: Json | null
          shipping_status?: string
          subtotal_cents?: number
          tracking_code?: string | null
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          config: Json
          id: boolean
          updated_at: string
        }
        Insert: {
          config: Json
          id?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_appmax_check: { Args: { _order_id: string }; Returns: boolean }
      claim_appmax_check_v2: { Args: { _order_id: string }; Returns: string | null }
      commit_appmax_check: {
        Args: {
          _order_id: string
          _expected_revision: string
          _payment_state: string | null
          _provider_payment_id: string | null
          _appmax_status: string | null
          _inconclusive: boolean
        }
        Returns: boolean
      }
      renew_appmax_check: { Args: { _order_id: string; _expected_revision: string }; Returns: string | null }
      defer_appmax_check: { Args: { _order_id: string; _expected_revision: string }; Returns: boolean }
      claim_bling_export: { Args: { _order_id: string }; Returns: Database["public"]["Tables"]["shipping_orders"]["Row"][] }
      quarantine_stale_bling_orders: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["shipping_orders"]["Row"][] }
      record_bling_recovery: { Args: { _order_id: string; _expected_revision: string; _outcome: string; _bling_order_id: number | null }; Returns: boolean }
      resolve_shipping_order_hold: { Args: { _order_id: string; _expected_revision: string; _action: string; _reason: string; _evidence: string }; Returns: string }
      consume_bling_oauth_state: {
        Args: { p_browser_hash: string; p_state_hash: string }
        Returns: {
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
