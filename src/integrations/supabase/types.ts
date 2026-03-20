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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      closed_days: {
        Row: {
          created_at: string
          date: string
          id: string
          label: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          label?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          label?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          audience: string
          body: string
          id: string
          slug: string
          subject: string
          updated_at: string
        }
        Insert: {
          audience: string
          body: string
          id?: string
          slug: string
          subject: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          id?: string
          slug?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      login_logs: {
        Row: {
          created_at: string
          email: string
          id: string
          last_seen_at: string
          logged_in_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_seen_at?: string
          logged_in_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_seen_at?: string
          logged_in_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mail_item_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          mail_item_id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          mail_item_id: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          mail_item_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_item_logs_mail_item_id_fkey"
            columns: ["mail_item_id"]
            isOneToOne: false
            referencedRelation: "mail_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_items: {
        Row: {
          action_rejected_reason: string | null
          chosen_action: string | null
          created_at: string
          id: string
          mail_type: Database["public"]["Enums"]["mail_type"]
          note_read: boolean
          notes: string | null
          operator_id: string
          photo_url: string | null
          pickup_date: string | null
          received_at: string
          scan_url: string | null
          scanned_at: string | null
          sender_name: string | null
          stamp_number: number | null
          status: Database["public"]["Enums"]["mail_status"]
          tenant_id: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          action_rejected_reason?: string | null
          chosen_action?: string | null
          created_at?: string
          id?: string
          mail_type?: Database["public"]["Enums"]["mail_type"]
          note_read?: boolean
          notes?: string | null
          operator_id: string
          photo_url?: string | null
          pickup_date?: string | null
          received_at?: string
          scan_url?: string | null
          scanned_at?: string | null
          sender_name?: string | null
          stamp_number?: number | null
          status?: Database["public"]["Enums"]["mail_status"]
          tenant_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          action_rejected_reason?: string | null
          chosen_action?: string | null
          created_at?: string
          id?: string
          mail_type?: Database["public"]["Enums"]["mail_type"]
          note_read?: boolean
          notes?: string | null
          operator_id?: string
          photo_url?: string | null
          pickup_date?: string | null
          received_at?: string
          scan_url?: string | null
          scanned_at?: string | null
          sender_name?: string | null
          stamp_number?: number | null
          status?: Database["public"]["Enums"]["mail_status"]
          tenant_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          mail_item_id: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          mail_item_id?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          mail_item_id?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_mail_item_id_fkey"
            columns: ["mail_item_id"]
            isOneToOne: false
            referencedRelation: "mail_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          category: string
          field_key: string
          field_value: string
          id: string
          tier: string
          updated_at: string
        }
        Insert: {
          category: string
          field_key: string
          field_value: string
          id?: string
          tier: string
          updated_at?: string
        }
        Update: {
          category?: string
          field_key?: string
          field_value?: string
          id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_type_changes: {
        Row: {
          created_at: string
          created_by: string
          effective_date: string
          executed_at: string | null
          id: string
          new_tenant_type_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_date: string
          executed_at?: string | null
          id?: string
          new_tenant_type_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_date?: string
          executed_at?: string | null
          id?: string
          new_tenant_type_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_type_changes_new_tenant_type_id_fkey"
            columns: ["new_tenant_type_id"]
            isOneToOne: false
            referencedRelation: "tenant_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_type_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tenant_types: {
        Row: {
          allowed_actions: Json
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          allowed_actions?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          allowed_actions?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          company_name: string
          contact_email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          created_at: string
          default_mail_action: string | null
          default_package_action: string | null
          id: string
          is_active: boolean
          shipping_address: string | null
          shipping_city: string | null
          shipping_co: string | null
          shipping_confirmed: boolean
          shipping_country: string | null
          shipping_recipient: string | null
          shipping_state: string | null
          shipping_zip: string | null
          tenant_type_id: string
          updated_at: string
          user_id: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_email?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          created_at?: string
          default_mail_action?: string | null
          default_package_action?: string | null
          id?: string
          is_active?: boolean
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_co?: string | null
          shipping_confirmed?: boolean
          shipping_country?: string | null
          shipping_recipient?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          tenant_type_id: string
          updated_at?: string
          user_id?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_email?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          created_at?: string
          default_mail_action?: string | null
          default_package_action?: string | null
          id?: string
          is_active?: boolean
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_co?: string | null
          shipping_confirmed?: boolean
          shipping_country?: string | null
          shipping_recipient?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          tenant_type_id?: string
          updated_at?: string
          user_id?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_tenant_type_id_fkey"
            columns: ["tenant_type_id"]
            isOneToOne: false
            referencedRelation: "tenant_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_login_logs: {
        Args: {
          _limit?: number
          _offset?: number
          _role: string
          _search?: string
        }
        Returns: {
          email: string
          id: string
          last_seen_at: string
          logged_in_at: string
          total_count: number
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
      is_operator: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_tenant_ids: { Args: never; Returns: string[] }
      owned_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      tenant_type_matches: {
        Args: { _tenant_id: string; _tenant_type_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "operator" | "tenant"
      mail_status:
        | "ny"
        | "afventer_handling"
        | "ulaest"
        | "laest"
        | "arkiveret"
        | "sendt_med_dao"
        | "sendt_med_postnord"
      mail_type: "brev" | "pakke"
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
    Enums: {
      app_role: ["operator", "tenant"],
      mail_status: [
        "ny",
        "afventer_handling",
        "ulaest",
        "laest",
        "arkiveret",
        "sendt_med_dao",
        "sendt_med_postnord",
      ],
      mail_type: ["brev", "pakke"],
    },
  },
} as const
