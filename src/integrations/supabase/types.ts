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
      audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          organisation_id: string
          store_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          organisation_id: string
          store_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          organisation_id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_import_rows: {
        Row: {
          catalogue_import_id: string
          created_at: string
          id: string
          mapped_product_id: string | null
          row_number: number
          source_data: Json
          source_product_id: string | null
          validation_errors: Json | null
          validation_status: Database["public"]["Enums"]["import_row_status"]
        }
        Insert: {
          catalogue_import_id: string
          created_at?: string
          id?: string
          mapped_product_id?: string | null
          row_number: number
          source_data: Json
          source_product_id?: string | null
          validation_errors?: Json | null
          validation_status: Database["public"]["Enums"]["import_row_status"]
        }
        Update: {
          catalogue_import_id?: string
          created_at?: string
          id?: string
          mapped_product_id?: string | null
          row_number?: number
          source_data?: Json
          source_product_id?: string | null
          validation_errors?: Json | null
          validation_status?: Database["public"]["Enums"]["import_row_status"]
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_import_rows_catalogue_import_id_fkey"
            columns: ["catalogue_import_id"]
            isOneToOne: false
            referencedRelation: "catalogue_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_import_rows_mapped_product_id_fkey"
            columns: ["mapped_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_imports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          catalogue_version_id: string | null
          created_at: string
          error_summary: string | null
          file_hash: string
          file_size_bytes: number | null
          filename: string
          id: string
          idempotency_key: string
          invalid_rows: number
          mime_type: string | null
          organisation_id: string
          published_at: string | null
          source_system: string
          status: Database["public"]["Enums"]["catalogue_import_status"]
          store_id: string | null
          total_rows: number
          updated_at: string
          uploaded_by: string | null
          valid_rows: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          catalogue_version_id?: string | null
          created_at?: string
          error_summary?: string | null
          file_hash: string
          file_size_bytes?: number | null
          filename: string
          id?: string
          idempotency_key: string
          invalid_rows?: number
          mime_type?: string | null
          organisation_id: string
          published_at?: string | null
          source_system?: string
          status?: Database["public"]["Enums"]["catalogue_import_status"]
          store_id?: string | null
          total_rows?: number
          updated_at?: string
          uploaded_by?: string | null
          valid_rows?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          catalogue_version_id?: string | null
          created_at?: string
          error_summary?: string | null
          file_hash?: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          idempotency_key?: string
          invalid_rows?: number
          mime_type?: string | null
          organisation_id?: string
          published_at?: string | null
          source_system?: string
          status?: Database["public"]["Enums"]["catalogue_import_status"]
          store_id?: string | null
          total_rows?: number
          updated_at?: string
          uploaded_by?: string | null
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_imports_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_imports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_imports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_publications: {
        Row: {
          catalogue_version_id: string
          id: string
          is_rollback: boolean
          notes: string | null
          published_at: string
          published_by: string | null
          store_id: string
          superseded_at: string | null
        }
        Insert: {
          catalogue_version_id: string
          id?: string
          is_rollback?: boolean
          notes?: string | null
          published_at?: string
          published_by?: string | null
          store_id: string
          superseded_at?: string | null
        }
        Update: {
          catalogue_version_id?: string
          id?: string
          is_rollback?: boolean
          notes?: string | null
          published_at?: string
          published_by?: string | null
          store_id?: string
          superseded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_publications_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_publications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_version_items: {
        Row: {
          active_ingredient: string
          aisle: string | null
          available_for_display: boolean
          bay: string | null
          brand_name: string | null
          catalogue_version_id: string
          created_at: string
          currency: string
          customer_summary: string | null
          display_group_codes: string[]
          drowsiness_level: Database["public"]["Enums"]["drowsiness_level"]
          formulation: Database["public"]["Enums"]["formulation_type"]
          id: string
          image_url: string | null
          pack_size: string
          price: number
          product_id: string
          product_name: string
          promotional_price: number | null
          requires_staff_help: boolean
          retailer_image_url: string | null
          retailer_product_name: string | null
          retailer_sku: string
          shelf: string | null
          snapshot_data: Json | null
          stock_quantity: number
          stock_status: Database["public"]["Enums"]["stock_status"]
          store_id: string
          strength: string | null
          treatment_group_code: string | null
          treatment_group_name: string | null
          warning_text: string | null
        }
        Insert: {
          active_ingredient: string
          aisle?: string | null
          available_for_display?: boolean
          bay?: string | null
          brand_name?: string | null
          catalogue_version_id: string
          created_at?: string
          currency?: string
          customer_summary?: string | null
          display_group_codes: string[]
          drowsiness_level: Database["public"]["Enums"]["drowsiness_level"]
          formulation: Database["public"]["Enums"]["formulation_type"]
          id?: string
          image_url?: string | null
          pack_size: string
          price: number
          product_id: string
          product_name: string
          promotional_price?: number | null
          requires_staff_help: boolean
          retailer_image_url?: string | null
          retailer_product_name?: string | null
          retailer_sku: string
          shelf?: string | null
          snapshot_data?: Json | null
          stock_quantity?: number
          stock_status: Database["public"]["Enums"]["stock_status"]
          store_id: string
          strength?: string | null
          treatment_group_code?: string | null
          treatment_group_name?: string | null
          warning_text?: string | null
        }
        Update: {
          active_ingredient?: string
          aisle?: string | null
          available_for_display?: boolean
          bay?: string | null
          brand_name?: string | null
          catalogue_version_id?: string
          created_at?: string
          currency?: string
          customer_summary?: string | null
          display_group_codes?: string[]
          drowsiness_level?: Database["public"]["Enums"]["drowsiness_level"]
          formulation?: Database["public"]["Enums"]["formulation_type"]
          id?: string
          image_url?: string | null
          pack_size?: string
          price?: number
          product_id?: string
          product_name?: string
          promotional_price?: number | null
          requires_staff_help?: boolean
          retailer_image_url?: string | null
          retailer_product_name?: string | null
          retailer_sku?: string
          shelf?: string | null
          snapshot_data?: Json | null
          stock_quantity?: number
          stock_status?: Database["public"]["Enums"]["stock_status"]
          store_id?: string
          strength?: string | null
          treatment_group_code?: string | null
          treatment_group_name?: string | null
          warning_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_version_items_catalogue_version_id_fkey"
            columns: ["catalogue_version_id"]
            isOneToOne: false
            referencedRelation: "catalogue_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_version_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_version_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          frozen_at: string | null
          id: string
          label: string | null
          notes: string | null
          organisation_id: string
          status: Database["public"]["Enums"]["catalogue_version_status"]
          updated_at: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          organisation_id: string
          status?: Database["public"]["Enums"]["catalogue_version_status"]
          updated_at?: string
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          organisation_id?: string
          status?: Database["public"]["Enums"]["catalogue_version_status"]
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_versions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      customer_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          kiosk_device_id: string | null
          last_activity_at: string
          organisation_id: string
          session_token_hash: string
          status: Database["public"]["Enums"]["session_status"]
          store_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kiosk_device_id?: string | null
          last_activity_at?: string
          organisation_id: string
          session_token_hash: string
          status?: Database["public"]["Enums"]["session_status"]
          store_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kiosk_device_id?: string | null
          last_activity_at?: string
          organisation_id?: string
          session_token_hash?: string
          status?: Database["public"]["Enums"]["session_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sessions_kiosk_device_id_fkey"
            columns: ["kiosk_device_id"]
            isOneToOne: false
            referencedRelation: "kiosk_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_lookup_attempts: {
        Row: {
          actor_ip: unknown
          actor_user_id: string | null
          created_at: string
          id: string
          reason: string | null
          store_id: string | null
          submitted_code_hash: string
          succeeded: boolean
        }
        Insert: {
          actor_ip?: unknown
          actor_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          store_id?: string | null
          submitted_code_hash: string
          succeeded: boolean
        }
        Update: {
          actor_ip?: unknown
          actor_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          store_id?: string | null
          submitted_code_hash?: string
          succeeded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "handover_lookup_attempts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      handovers: {
        Row: {
          completed_at: string | null
          expires_at: string
          handover_code_hash: string
          handover_code_masked: string | null
          id: string
          opened_at: string | null
          opened_by: string | null
          requested_at: string
          session_id: string
          status: Database["public"]["Enums"]["handover_status"]
          store_id: string
        }
        Insert: {
          completed_at?: string | null
          expires_at?: string
          handover_code_hash: string
          handover_code_masked?: string | null
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          requested_at?: string
          session_id: string
          status?: Database["public"]["Enums"]["handover_status"]
          store_id: string
        }
        Update: {
          completed_at?: string | null
          expires_at?: string
          handover_code_hash?: string
          handover_code_masked?: string | null
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          requested_at?: string
          session_id?: string
          status?: Database["public"]["Enums"]["handover_status"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handovers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "customer_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
      session_shortlist: {
        Row: {
          action_type: Database["public"]["Enums"]["shortlist_action"]
          created_at: string
          id: string
          session_id: string
          store_product_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["shortlist_action"]
          created_at?: string
          id?: string
          session_id: string
          store_product_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["shortlist_action"]
          created_at?: string
          id?: string
          session_id?: string
          store_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_shortlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "customer_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_shortlist_store_product_id_fkey"
            columns: ["store_product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      session_symptoms: {
        Row: {
          created_at: string
          id: string
          session_id: string
          symptom_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          symptom_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_symptoms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "customer_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_symptoms_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
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
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country_code: string | null
          created_at: string
          id: string
          name: string
          organisation_id: string
          postcode: string | null
          status: Database["public"]["Enums"]["entity_status"]
          store_code: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          postcode?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          store_code: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          postcode?: string | null
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
      catalogue_approver_decide_import: {
        Args: { _decision: string; _error_summary?: string; _import: string }
        Returns: undefined
      }
      catalogue_editor_update_import: {
        Args: {
          _error_summary?: string
          _import: string
          _invalid_rows?: number
          _status: Database["public"]["Enums"]["catalogue_import_status"]
          _total_rows?: number
          _valid_rows?: number
        }
        Returns: undefined
      }
      publish_catalogue_version: {
        Args: { _notes?: string; _store: string; _version: string }
        Returns: string
      }
      rollback_catalogue_publication: {
        Args: { _notes?: string; _store: string; _target_version: string }
        Returns: string
      }
      staff_open_handover: {
        Args: { _code: string; _store: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "catalogue_approver"
        | "catalogue_editor"
        | "store_manager"
        | "pharmacy_staff"
      catalogue_import_status:
        | "uploaded"
        | "validating"
        | "validation_failed"
        | "ready_for_review"
        | "approved"
        | "published"
        | "rejected"
      catalogue_version_status:
        | "draft"
        | "approved"
        | "superseded"
        | "rolled_back"
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
      handover_status:
        | "waiting"
        | "opened"
        | "completed"
        | "expired"
        | "cancelled"
      import_row_status: "valid" | "invalid" | "skipped_duplicate"
      kiosk_status: "active" | "suspended" | "retired"
      session_status: "active" | "handover_requested" | "completed" | "expired"
      shortlist_action: "viewed" | "compared" | "shortlisted" | "removed"
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
      catalogue_import_status: [
        "uploaded",
        "validating",
        "validation_failed",
        "ready_for_review",
        "approved",
        "published",
        "rejected",
      ],
      catalogue_version_status: [
        "draft",
        "approved",
        "superseded",
        "rolled_back",
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
      handover_status: [
        "waiting",
        "opened",
        "completed",
        "expired",
        "cancelled",
      ],
      import_row_status: ["valid", "invalid", "skipped_duplicate"],
      kiosk_status: ["active", "suspended", "retired"],
      session_status: ["active", "handover_requested", "completed", "expired"],
      shortlist_action: ["viewed", "compared", "shortlisted", "removed"],
      stock_status: ["in_stock", "low_stock", "out_of_stock", "ask_staff"],
    },
  },
} as const
