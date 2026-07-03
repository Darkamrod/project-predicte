export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          locale: string;
          timezone: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          deleted_at?: string | null;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      leagues: {
        Row: {
          id: string;
          competition_edition_id: string;
          owner_id: string;
          name: string;
          status: "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";
          deadline_at: string;
          current_scoring_rule_version_id: string | null;
          invite_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      league_members: {
        Row: {
          league_id: string;
          user_id: string;
          role: "owner" | "admin" | "participant";
          status: "active" | "removed";
          joined_at: string;
          removed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      league_invites: {
        Row: {
          id: string;
          league_id: string;
          hashed_token: string;
          created_by: string;
          expires_at: string | null;
          max_uses: number | null;
          uses: number;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_private_league: {
        Args: {
          p_competition_edition_id: string;
          p_name: string;
          p_deadline_at: string;
          p_scoring_preset_id?: string | null;
        };
        Returns: string;
      };
      create_league_invite: {
        Args: {
          p_league_id: string;
          p_expires_at?: string | null;
          p_max_uses?: number | null;
        };
        Returns: {
          invite_id: string;
          token: string;
          expires_at: string | null;
        }[];
      };
      join_league_by_invite: {
        Args: {
          p_token: string;
        };
        Returns: string;
      };
      set_league_member_role: {
        Args: {
          p_league_id: string;
          p_user_id: string;
          p_role: "admin" | "participant";
        };
        Returns: void;
      };
      remove_league_member: {
        Args: {
          p_league_id: string;
          p_user_id: string;
        };
        Returns: void;
      };
      update_league_deadline: {
        Args: {
          p_league_id: string;
          p_deadline_at: string;
        };
        Returns: void;
      };
      lock_league: {
        Args: {
          p_league_id: string;
        };
        Returns: void;
      };
      lock_due_leagues: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      league_member_role: "owner" | "admin" | "participant";
      league_status: "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
}
