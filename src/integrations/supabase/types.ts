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
      customer_display_groups: {
        Row: {
          active: boolean
          code: string
          created_at: string
          customer_description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          customer_description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          customer_description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kiosk_devices: {
        Row: {
          created_at: string
          created_by: string | null
          device_token_hash: string
          id: string
          label: string
          last_seen_at: string | null
          organisation_id: string
          status: Database["public"]["Enums"]["kiosk_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_token_hash: string
          id?: string
          label: string
          last_seen_at?: string | null
          organisation_id: string
          status?: Database["public"]["Enums"]["kiosk_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_token_hash?: string
          id?: string
          label?: string
          last_seen_at?: string | null
          organisation_id?: string
          status?: Database["public"]["Enums"]["kiosk_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_devices_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_devices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_memberships: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_profile_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_profile_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_profile_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_memberships_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      product_display_group_mappings: {
        Row: {
          active: boolean
          created_at: string
          display_group_id: string
          id: string
          product_id: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_group_id: string
          id?: string
          product_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          display_group_id?: string
          id?: string
          product_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_display_group_mappings_display_group_id_fkey"
            columns: ["display_group_id"]
            isOneToOne: false
            referencedRelation: "customer_display_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_display_group_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          active_ingredient: string
          brand_name: string | null
          created_at: string
          customer_summary: string | null
          drowsiness_level: Database["public"]["Enums"]["drowsiness_level"]
          formulation: Database["public"]["Enums"]["formulation_type"]
          gtin: string | null
          id: string
          image_url: string | null
          pack_size: string
          product_name: string
          requires_staff_help: boolean
          strength: string | null
          treatment_group_id: string | null
          updated_at: string
          warning_text: string | null
        }
        Insert: {
          active?: boolean
          active_ingredient: string
          brand_name?: string | null
          created_at?: string
          customer_summary?: string | null
          drowsiness_level?: Database["public"]["Enums"]["drowsiness_level"]
          formulation: Database["public"]["Enums"]["formulation_type"]
          gtin?: string | null
          id?: string
          image_url?: string | null
          pack_size: string
          product_name: string
          requires_staff_help?: boolean
          strength?: string | null
          treatment_group_id?: string | null
          updated_at?: string
          warning_text?: string | null
        }
        Update: {
          active?: boolean
          active_ingredient?: string
          brand_name?: string | null
          created_at?: string
          customer_summary?: string | null
          drowsiness_level?: Database["public"]["Enums"]["drowsiness_level"]
          formulation?: Database["public"]["Enums"]["formulation_type"]
          gtin?: string | null
          id?: string
          image_url?: string | null
          pack_size?: string
          product_name?: string
          requires_staff_help?: boolean
          strength?: string | null
          treatment_group_id?: string | null
          updated_at?: string
          warning_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_treatment_group_id_fkey"
            columns: ["treatment_group_id"]
            isOneToOne: false
            referencedRelation: "treatment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          full_name: string
          id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          full_name: string
          id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          full_name?: string
          id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      store_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          staff_profile_id: string
          status: Database["public"]["Enums"]["entity_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          staff_profile_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_profile_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_memberships_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_memberships_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          aisle: string | null
          available_for_display: boolean
          bay: string | null
          created_at: string
          currency: string
          data_last_updated_at: string
          id: string
          price: number
          product_id: string
          promotional_price: number | null
          retailer_image_url: string | null
          retailer_product_name: string | null
          retailer_sku: string
          shelf: string | null
          stock_quantity: number
          stock_status: Database["public"]["Enums"]["stock_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          aisle?: string | null
          available_for_display?: boolean
          bay?: string | null
          created_at?: string
          currency?: string
          data_last_updated_at?: string
          id?: string
          price: number
          product_id: string
          promotional_price?: number | null
          retailer_image_url?: string | null
          retailer_product_name?: string | null
          retailer_sku: string
          shelf?: string | null
          stock_quantity?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          aisle?: string | null
          available_for_display?: boolean
          bay?: string | null
          created_at?: string
          currency?: string
          data_last_updated_at?: string
          id?: string
          price?: number
          product_id?: string
          promotional_price?: number | null
          retailer_image_url?: string | null
          retailer_product_name?: string | null
          retailer_sku?: string
          shelf?: string | null
          stock_quantity?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          organisation_id: string
          status: Database["public"]["Enums"]["entity_status"]
          store_code: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          store_code: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          store_code?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_display_group_mappings: {
        Row: {
          active: boolean
          created_at: string
          display_group_id: string
          id: string
          relevance_weight: number
          symptom_id: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_group_id: string
          id?: string
          relevance_weight?: number
          symptom_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          display_group_id?: string
          id?: string
          relevance_weight?: number
          symptom_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "symptom_display_group_mappings_display_group_id_fkey"
            columns: ["display_group_id"]
            isOneToOne: false
            referencedRelation: "customer_display_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_display_group_mappings_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms: {
        Row: {
          active: boolean
          code: string
          created_at: string
          customer_description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          customer_description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          customer_description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      treatment_groups: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_staff_profile_id: { Args: never; Returns: string }
      has_org_membership: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      has_org_role: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
      has_store_membership: {
        Args: { _store: string; _user: string }
        Returns: boolean
      }
      has_store_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _store: string
          _user: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "catalogue_approver"
        | "catalogue_editor"
        | "store_manager"
        | "pharmacy_staff"
      drowsiness_level: "none" | "low" | "moderate" | "high"
      entity_status: "active" | "inactive" | "archived"
      formulation_type:
        | "tablet"
        | "capsule"
        | "oral_liquid"
        | "nasal_spray"
        | "nasal_drops"
        | "eye_drops"
        | "cream"
        | "ointment"
        | "lozenge"
        | "powder"
        | "other"
      kiosk_status: "active" | "suspended" | "retired"
      stock_status: "in_stock" | "low_stock" | "out_of_stock" | "ask_staff"
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
      app_role: [
        "platform_admin",
        "catalogue_approver",
        "catalogue_editor",
        "store_manager",
        "pharmacy_staff",
      ],
      drowsiness_level: ["none", "low", "moderate", "high"],
      entity_status: ["active", "inactive", "archived"],
      formulation_type: [
        "tablet",
        "capsule",
        "oral_liquid",
        "nasal_spray",
        "nasal_drops",
        "eye_drops",
        "cream",
        "ointment",
        "lozenge",
        "powder",
        "other",
      ],
      kiosk_status: ["active", "suspended", "retired"],
      stock_status: ["in_stock", "low_stock", "out_of_stock", "ask_staff"],
    },
  },
} as const
