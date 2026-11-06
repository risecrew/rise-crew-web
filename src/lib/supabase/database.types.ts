export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activities: {
        Row: {
          city_en: string;
          city_ko: string;
          created_at: string;
          date: string | null;
          id: string;
          is_planned: boolean;
          photo: string | null;
          photo_alt_en: string;
          photo_alt_ko: string;
          summary_en: string;
          summary_ko: string;
          title_en: string;
          title_ko: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          city_en?: string;
          city_ko: string;
          created_at?: string;
          date?: string | null;
          id?: string;
          is_planned?: boolean;
          photo?: string | null;
          photo_alt_en?: string;
          photo_alt_ko?: string;
          summary_en?: string;
          summary_ko?: string;
          title_en?: string;
          title_ko: string;
          updated_at?: string;
        };
        Update: {
          city_en?: string;
          city_ko?: string;
          created_at?: string;
          date?: string | null;
          id?: string;
          is_planned?: boolean;
          photo?: string | null;
          photo_alt_en?: string;
          photo_alt_ko?: string;
          summary_en?: string;
          summary_ko?: string;
          title_en?: string;
          title_ko?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          created_at: string;
          granted: boolean;
          id: number;
          kind: string;
          policy_version: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          granted: boolean;
          id?: never;
          kind: string;
          policy_version: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted?: boolean;
          id?: never;
          kind?: string;
          policy_version?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notices: {
        Row: {
          attachments: NonNullable<Json>;
          body_en: string;
          body_ko: string;
          created_at: string;
          id: string;
          is_pinned: boolean;
          photo_paths: string[];
          title_en: string;
          title_ko: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attachments?: NonNullable<Json>;
          body_en?: string;
          body_ko: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          photo_paths?: string[];
          title_en?: string;
          title_ko: string;
          updated_at?: string;
        };
        Update: {
          attachments?: NonNullable<Json>;
          body_en?: string;
          body_ko?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          photo_paths?: string[];
          title_en?: string;
          title_ko?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          affiliation: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          major: string | null;
          occupation: Database['public']['Enums']['occupation'] | null;
          onboarded_at: string | null;
          recruit_opt_in: boolean;
          school: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          affiliation?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          major?: string | null;
          occupation?: Database['public']['Enums']['occupation'] | null;
          onboarded_at?: string | null;
          recruit_opt_in?: boolean;
          school?: string | null;
          updated_at?: string;
        };
        Update: {
          affiliation?: string | null;
          created_at?: string;
          email?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          major?: string | null;
          occupation?: Database['public']['Enums']['occupation'] | null;
          onboarded_at?: string | null;
          recruit_opt_in?: boolean;
          school?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          created_at: string;
          team_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          team_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      team_posts: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          edited_at: string | null;
          hidden_at: string | null;
          id: string;
          photo_paths: string[];
          team_id: string;
          title: string;
          updated_at: string;
          visibility: Database['public']['Enums']['team_post_visibility'];
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          hidden_at?: string | null;
          id?: string;
          photo_paths?: string[];
          team_id: string;
          title: string;
          updated_at?: string;
          visibility?: Database['public']['Enums']['team_post_visibility'];
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          hidden_at?: string | null;
          id?: string;
          photo_paths?: string[];
          team_id?: string;
          title?: string;
          updated_at?: string;
          visibility?: Database['public']['Enums']['team_post_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'team_posts_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          cohort: number;
          cover_path: string | null;
          created_at: string;
          field: string;
          id: string;
          intro: string;
          is_published: boolean;
          links: NonNullable<Json>;
          logo_path: string | null;
          name: string;
          slug: string;
          tagline: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cohort: number;
          cover_path?: string | null;
          created_at?: string;
          field: string;
          id?: string;
          intro?: string;
          is_published?: boolean;
          links?: NonNullable<Json>;
          logo_path?: string | null;
          name: string;
          slug: string;
          tagline?: string;
          updated_at?: string;
        };
        Update: {
          cohort?: number;
          cover_path?: string | null;
          created_at?: string;
          field?: string;
          id?: string;
          intro?: string;
          is_published?: boolean;
          links?: NonNullable<Json>;
          logo_path?: string | null;
          name?: string;
          slug?: string;
          tagline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          blocked_at: string | null;
          role: Database['public']['Enums']['app_role'];
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_at?: string | null;
          role?: Database['public']['Enums']['app_role'];
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          blocked_at?: string | null;
          role?: Database['public']['Enums']['app_role'];
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      member_list: {
        Row: {
          affiliation: string | null;
          blocked_at: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          major: string | null;
          occupation: Database['public']['Enums']['occupation'] | null;
          onboarded_at: string | null;
          recruit_opt_in: boolean;
          role: Database['public']['Enums']['app_role'];
          school: string | null;
          search_text: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      team_signed_in_post_count: { Args: { team: string }; Returns: number };
    };
    Enums: {
      app_role: 'guest' | 'member' | 'operator' | 'admin';
      occupation: 'undergrad' | 'grad' | 'alumni' | 'founder' | 'other';
      team_post_visibility: 'public' | 'signed_in';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ['guest', 'member', 'operator', 'admin'],
      occupation: ['undergrad', 'grad', 'alumni', 'founder', 'other'],
      team_post_visibility: ['public', 'signed_in'],
    },
  },
} as const;
