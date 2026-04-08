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
  cms: {
    Tables: {
      admin_profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          default_locale: string
          display_name: string
          id: string
          revoked_after: string | null
          status: Database["cms"]["Enums"]["admin_profile_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          default_locale?: string
          display_name: string
          id?: string
          revoked_after?: string | null
          status?: Database["cms"]["Enums"]["admin_profile_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          default_locale?: string
          display_name?: string
          id?: string
          revoked_after?: string | null
          status?: Database["cms"]["Enums"]["admin_profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      admin_security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          profile_id: string | null
          success: boolean
          user_agent_hash: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          profile_id?: string | null
          success?: boolean
          user_agent_hash?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          profile_id?: string | null
          success?: boolean
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_security_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_localizations: {
        Row: {
          created_at: string
          document_id: string
          id: string
          locale_code: string
          slug: string
          summary: string | null
          title: string
          translation_status: Database["cms"]["Enums"]["translation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          locale_code: string
          slug: string
          summary?: string | null
          title: string
          translation_status?: Database["cms"]["Enums"]["translation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          locale_code?: string
          slug?: string
          summary?: string | null
          title?: string
          translation_status?: Database["cms"]["Enums"]["translation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_localizations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_localizations_locale_code_fkey"
            columns: ["locale_code"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      document_revisions: {
        Row: {
          change_note: string | null
          content_json: Json
          created_at: string
          created_by: string | null
          document_id: string
          editor_state: Database["cms"]["Enums"]["content_state"]
          id: string
          locale_code: string
          revision_number: number
        }
        Insert: {
          change_note?: string | null
          content_json?: Json
          created_at?: string
          created_by?: string | null
          document_id: string
          editor_state?: Database["cms"]["Enums"]["content_state"]
          id?: string
          locale_code: string
          revision_number: number
        }
        Update: {
          change_note?: string | null
          content_json?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string
          editor_state?: Database["cms"]["Enums"]["content_state"]
          id?: string
          locale_code?: string
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_revisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_revisions_locale_code_fkey"
            columns: ["locale_code"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          content_type: Database["cms"]["Enums"]["content_type"]
          created_at: string
          default_locale: string
          id: string
          published_at: string | null
          published_revision_id: string | null
          state: Database["cms"]["Enums"]["content_state"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          content_type: Database["cms"]["Enums"]["content_type"]
          created_at?: string
          default_locale?: string
          id?: string
          published_at?: string | null
          published_revision_id?: string | null
          state?: Database["cms"]["Enums"]["content_state"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          content_type?: Database["cms"]["Enums"]["content_type"]
          created_at?: string
          default_locale?: string
          id?: string
          published_at?: string | null
          published_revision_id?: string | null
          state?: Database["cms"]["Enums"]["content_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_published_revision_fk"
            columns: ["published_revision_id"]
            isOneToOne: false
            referencedRelation: "document_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          rules_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          rules_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          rules_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          created_at: string
          document_id: string
          effective_from: string | null
          effective_to: string | null
          id: string
          jurisdiction_profile_code: string | null
          legal_doc_type: string
          updated_at: string
          version_label: string
        }
        Insert: {
          created_at?: string
          document_id: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          jurisdiction_profile_code?: string | null
          legal_doc_type: string
          updated_at?: string
          version_label: string
        }
        Update: {
          created_at?: string
          document_id?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          jurisdiction_profile_code?: string | null
          legal_doc_type?: string
          updated_at?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_jurisdiction_profile_code_fkey"
            columns: ["jurisdiction_profile_code"]
            isOneToOne: false
            referencedRelation: "region_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      locales: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          language: string
          region: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          language: string
          region: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          language?: string
          region?: string
        }
        Relationships: []
      }
      media_asset_localizations: {
        Row: {
          alt_text: string
          caption: string | null
          created_at: string
          id: string
          locale_code: string
          media_asset_id: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          caption?: string | null
          created_at?: string
          id?: string
          locale_code: string
          media_asset_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          id?: string
          locale_code?: string
          media_asset_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_localizations_locale_code_fkey"
            columns: ["locale_code"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "media_asset_localizations_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bucket: string
          byte_size: number
          created_at: string
          height: number | null
          id: string
          mime_type: string
          path: string
          sha256: string | null
          status: Database["cms"]["Enums"]["media_asset_status"]
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          bucket: string
          byte_size: number
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          path: string
          sha256?: string | null
          status?: Database["cms"]["Enums"]["media_asset_status"]
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          bucket?: string
          byte_size?: number
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          path?: string
          sha256?: string | null
          status?: Database["cms"]["Enums"]["media_asset_status"]
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      methods: {
        Row: {
          created_at: string
          document_id: string
          id: string
          method_code: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          method_code: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          method_code?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "methods_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          document_id: string
          id: string
          nav_group: string | null
          page_kind: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          nav_group?: string | null
          page_kind: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          nav_group?: string | null
          page_kind?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          id: string
          resource: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          id?: string
          resource: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          id?: string
          resource?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_profile_id: string | null
          created_at: string
          document_id: string
          featured: boolean
          id: string
          published_sort_at: string | null
          updated_at: string
        }
        Insert: {
          author_profile_id?: string | null
          created_at?: string
          document_id: string
          featured?: boolean
          id?: string
          published_sort_at?: string | null
          updated_at?: string
        }
        Update: {
          author_profile_id?: string | null
          created_at?: string
          document_id?: string
          featured?: boolean
          id?: string
          published_sort_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          completed_on: string | null
          created_at: string
          document_id: string
          featured: boolean
          id: string
          industry: string | null
          result_metrics_json: Json
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          completed_on?: string | null
          created_at?: string
          document_id: string
          featured?: boolean
          id?: string
          industry?: string | null
          result_metrics_json?: Json
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          completed_on?: string | null
          created_at?: string
          document_id?: string
          featured?: boolean
          id?: string
          industry?: string | null
          result_metrics_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      region_profiles: {
        Row: {
          code: string
          created_at: string
          display_name: string
          id: string
          rule_set_key: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          id?: string
          rule_set_key: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          rule_set_key?: string
        }
        Relationships: []
      }
      reusable_sections: {
        Row: {
          content_json: Json
          content_type_scope: Database["cms"]["Enums"]["content_type"][] | null
          created_at: string
          id: string
          schema_version: number
          section_key: string
          state: Database["cms"]["Enums"]["content_state"]
          updated_at: string
        }
        Insert: {
          content_json?: Json
          content_type_scope?: Database["cms"]["Enums"]["content_type"][] | null
          created_at?: string
          id?: string
          schema_version?: number
          section_key: string
          state?: Database["cms"]["Enums"]["content_state"]
          updated_at?: string
        }
        Update: {
          content_json?: Json
          content_type_scope?: Database["cms"]["Enums"]["content_type"][] | null
          created_at?: string
          id?: string
          schema_version?: number
          section_key?: string
          state?: Database["cms"]["Enums"]["content_state"]
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      seo_metadata: {
        Row: {
          canonical_url_override: string | null
          created_at: string
          document_localization_id: string
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image_asset_id: string | null
          robots_index: boolean
          schema_json: Json
          updated_at: string
        }
        Insert: {
          canonical_url_override?: string | null
          created_at?: string
          document_localization_id: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_asset_id?: string | null
          robots_index?: boolean
          schema_json?: Json
          updated_at?: string
        }
        Update: {
          canonical_url_override?: string | null
          created_at?: string
          document_localization_id?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_asset_id?: string | null
          robots_index?: boolean
          schema_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_metadata_document_localization_id_fkey"
            columns: ["document_localization_id"]
            isOneToOne: true
            referencedRelation: "document_localizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_metadata_og_image_fk"
            columns: ["og_image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          document_id: string
          id: string
          inquiry_form_type: string | null
          service_code: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          inquiry_form_type?: string | null
          service_code: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          inquiry_form_type?: string | null
          service_code?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          json_value: Json
          key: string
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          json_value?: Json
          key: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          json_value?: Json
          key?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_admin_profile_id: { Args: never; Returns: string }
      has_role: { Args: { role_code: string }; Returns: boolean }
    }
    Enums: {
      admin_profile_status: "invited" | "active" | "suspended" | "revoked"
      content_state: "draft" | "review" | "scheduled" | "published" | "archived"
      content_type: "page" | "post" | "project" | "service" | "method" | "legal"
      media_asset_status: "pending" | "ready" | "rejected" | "archived"
      translation_status: "missing" | "in_progress" | "ready" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  ops: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_hash: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hash?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hash?: string | null
        }
        Relationships: []
      }
      consent_events: {
        Row: {
          categories_json: Json
          country_code: string | null
          created_at: string
          id: string
          locale_code: string
          policy_version: string
          rule_set_key: string
          visitor_id_hash: string
        }
        Insert: {
          categories_json: Json
          country_code?: string | null
          created_at?: string
          id?: string
          locale_code: string
          policy_version: string
          rule_set_key: string
          visitor_id_hash: string
        }
        Update: {
          categories_json?: Json
          country_code?: string | null
          created_at?: string
          id?: string
          locale_code?: string
          policy_version?: string
          rule_set_key?: string
          visitor_id_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_policy_version_fkey"
            columns: ["policy_version"]
            isOneToOne: false
            referencedRelation: "cookie_policy_versions"
            referencedColumns: ["policy_version"]
          },
          {
            foreignKeyName: "consent_events_rule_set_key_fkey"
            columns: ["rule_set_key"]
            isOneToOne: false
            referencedRelation: "consent_rule_sets"
            referencedColumns: ["rule_set_key"]
          },
        ]
      }
      consent_rule_sets: {
        Row: {
          banner_copy_ref: string | null
          categories_json: Json
          created_at: string
          default_mode: string
          id: string
          rule_set_key: string
          updated_at: string
        }
        Insert: {
          banner_copy_ref?: string | null
          categories_json?: Json
          created_at?: string
          default_mode: string
          id?: string
          rule_set_key: string
          updated_at?: string
        }
        Update: {
          banner_copy_ref?: string | null
          categories_json?: Json
          created_at?: string
          default_mode?: string
          id?: string
          rule_set_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          company: string | null
          consent_snapshot_json: Json
          country_code: string | null
          created_at: string
          deleted_at: string | null
          email: string
          form_type: string
          id: string
          locale_code: string
          message: string
          name: string
          service_interest: string | null
          spam_score: number | null
          status: Database["ops"]["Enums"]["submission_status"]
          submitted_at: string
        }
        Insert: {
          company?: string | null
          consent_snapshot_json?: Json
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          form_type: string
          id?: string
          locale_code: string
          message: string
          name: string
          service_interest?: string | null
          spam_score?: number | null
          status?: Database["ops"]["Enums"]["submission_status"]
          submitted_at?: string
        }
        Update: {
          company?: string | null
          consent_snapshot_json?: Json
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          form_type?: string
          id?: string
          locale_code?: string
          message?: string
          name?: string
          service_interest?: string | null
          spam_score?: number | null
          status?: Database["ops"]["Enums"]["submission_status"]
          submitted_at?: string
        }
        Relationships: []
      }
      cookie_policy_versions: {
        Row: {
          created_at: string
          id: string
          policy_version: string
          published_at: string | null
          rule_set_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_version: string
          published_at?: string | null
          rule_set_key: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_version?: string
          published_at?: string | null
          rule_set_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "cookie_policy_versions_rule_set_key_fkey"
            columns: ["rule_set_key"]
            isOneToOne: false
            referencedRelation: "consent_rule_sets"
            referencedColumns: ["rule_set_key"]
          },
        ]
      }
      job_runs: {
        Row: {
          ended_at: string | null
          id: string
          job_key: string
          result_json: Json
          started_at: string
          status: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          job_key: string
          result_json?: Json
          started_at?: string
          status: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          job_key?: string
          result_json?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      preview_tokens: {
        Row: {
          created_at: string
          document_id: string
          expires_at: string
          id: string
          locale_code: string
          revision_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          expires_at: string
          id?: string
          locale_code: string
          revision_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          expires_at?: string
          id?: string
          locale_code?: string
          revision_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_audit_log: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity_id?: string
          p_entity_type: string
          p_ip_hash?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      submission_status: "new" | "reviewed" | "archived" | "deleted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  cms: {
    Enums: {
      admin_profile_status: ["invited", "active", "suspended", "revoked"],
      content_state: ["draft", "review", "scheduled", "published", "archived"],
      content_type: ["page", "post", "project", "service", "method", "legal"],
      media_asset_status: ["pending", "ready", "rejected", "archived"],
      translation_status: ["missing", "in_progress", "ready", "published"],
    },
  },
  ops: {
    Enums: {
      submission_status: ["new", "reviewed", "archived", "deleted"],
    },
  },
  public: {
    Enums: {},
  },
} as const
