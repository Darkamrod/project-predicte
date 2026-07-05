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
      sports: {
        Row: {
          id: string;
          code: "FOOTBALL";
          name: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      competition_templates: {
        Row: {
          id: string;
          sport_id: string;
          code: "FIFA_WORLD_CUP" | "UEFA_EURO" | "UEFA_CHAMPIONS_LEAGUE";
          name: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      competition_editions: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          season_label: string;
          enabled: boolean;
          first_kickoff_at: string | null;
          maximum_deadline_at: string | null;
          format: Json;
          data_completeness: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      stages: {
        Row: {
          id: string;
          edition_id: string;
          code: string;
          kind: string;
          name: string;
          sort_order: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          edition_id: string;
          stage_id: string;
          code: string;
          name: string;
          sort_order: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          edition_id: string;
          stage_id: string;
          code: string;
          name: string;
          sort_order: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          country_code: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string | null;
          display_name: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      edition_teams: {
        Row: {
          edition_id: string;
          team_id: string;
          seed_group_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          edition_id: string;
          stage_id: string;
          group_id: string | null;
          round_id: string | null;
          home_team_id: string | null;
          away_team_id: string | null;
          bracket_payload: Json;
          kickoff_at: string | null;
          status:
            | "NOT_STARTED"
            | "LIVE"
            | "HALFTIME"
            | "FULL_TIME"
            | "AFTER_EXTRA_TIME"
            | "AFTER_PENALTIES"
            | "POSTPONED"
            | "SUSPENDED"
            | "CANCELLED"
            | "ABANDONED"
            | "AWARDED"
            | "UNKNOWN";
          sort_order: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      bracket_slots: {
        Row: {
          id: string;
          edition_id: string;
          round_id: string;
          source_type: string;
          source_payload: Json;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      competition_antepost_definitions: {
        Row: {
          id: string;
          edition_id: string;
          code: "TOURNAMENT_WINNER" | "TOP_SCORER" | "TOP_SCORER_GOALS";
          label: string;
          value_type: "TEAM" | "PLAYER" | "NUMBER";
          required: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      provider_payloads: {
        Row: {
          id: string;
          provider: string;
          external_id: string;
          payload: Json;
          received_at: string;
          sync_run_id: string | null;
          payload_kind: string;
          source_result_key: string | null;
          correction_of_source_result_key: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sync_runs: {
        Row: {
          id: string;
          provider: string;
          sync_type: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          error_message: string | null;
          external_fixture_key: string | null;
          source_result_key: string | null;
          correction_of_source_result_key: string | null;
          retry_attempt: number;
          max_retries: number;
          next_retry_at: string | null;
          failure_kind: "none" | "retryable" | "non_retryable";
        };
        Insert: never;
        Update: never;
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
      league_scoring_rule_versions: {
        Row: {
          id: string;
          league_id: string;
          version: number;
          status: "draft" | "locked";
          schema_version: number;
          config: Json;
          checksum: string | null;
          created_by: string | null;
          created_at: string;
          locked_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      league_scoring_rule_changes: {
        Row: {
          id: string;
          league_id: string;
          rule_version_id: string;
          actor_user_id: string | null;
          scope: "stage" | "antepost";
          stage: string | null;
          field: string;
          previous_value: number;
          next_value: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      prediction_sets: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          status: "draft" | "complete" | "locked";
          total_required: number;
          completed_items: number;
          unsynced_items: number;
          last_server_synced_at: string | null;
          completed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      match_predictions: {
        Row: {
          id: string;
          prediction_set_id: string;
          match_id: string | null;
          prediction_ref: string;
          stage_code: string;
          regulation_home_goals: number;
          regulation_away_goals: number;
          qualified_team_id: string | null;
          advancement_method: "REGULATION" | "EXTRA_TIME" | "PENALTIES" | null;
          home_team_id: string | null;
          away_team_id: string | null;
          depends_on_prediction_refs: string[];
          validation_status: "valid" | "invalid" | "incomplete";
          sync_status: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      prediction_tiebreak_overrides: {
        Row: {
          id: string;
          prediction_set_id: string;
          scope_ref: string;
          ordered_team_ids: string[];
          reason: string;
          created_at: string;
          updated_at: string;
          sync_status: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      antepost_predictions: {
        Row: {
          id: string;
          prediction_set_id: string;
          definition_id: string;
          selected_payload: Json;
          updated_at: string;
          sync_status: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      scoring_events: {
        Row: {
          id: string;
          event_key: string;
          league_id: string;
          participant_user_id: string;
          competition_edition_id: string;
          reference_id: string;
          scoring_rule_version_id: string;
          event_type: string;
          points: number;
          reason: string;
          calculation_version: string;
          source_result_version_id: string | null;
          source_result_key: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      scoring_breakdown_items: {
        Row: {
          id: string;
          breakdown_key: string;
          league_id: string;
          participant_user_id: string;
          scoring_event_id: string | null;
          source_result_key: string;
          scope: "MATCH" | "STAGE" | "ANTEPOST";
          reference_id: string;
          stage: string | null;
          event_type: string;
          points: number;
          reason: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      leaderboard_snapshots: {
        Row: {
          id: string;
          league_id: string;
          snapshot_key: string;
          source_result_version_id: string | null;
          source_result_key: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      leaderboard_entries: {
        Row: {
          snapshot_id: string;
          user_id: string;
          rank: number;
          total_points: number;
          latest_points: number;
          position_delta: number;
          tied: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      scoring_recalculation_runs: {
        Row: {
          id: string;
          league_id: string;
          source_result_key: string | null;
          actor_user_id: string | null;
          snapshot_id: string | null;
          status: string;
          reason: string;
          started_at: string;
          finished_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      result_ingestion_runs: {
        Row: {
          id: string;
          league_id: string;
          source_result_key: string;
          correction_of_source_result_key: string | null;
          payload: Json;
          status: "accepted" | "scored" | "failed";
          trusted_actor: string;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
          provider: string | null;
          external_fixture_key: string | null;
          provider_payload_id: string | null;
          sync_run_id: string | null;
          retry_attempt: number;
          max_retries: number;
          next_retry_at: string | null;
          correction_status: "not_required" | "verified" | "missing";
          failure_kind: "none" | "retryable" | "non_retryable";
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
      save_match_prediction: {
        Args: {
          p_league_id: string;
          p_match_id?: string | null;
          p_prediction_ref?: string | null;
          p_stage_code?: string | null;
          p_regulation_home_goals?: number;
          p_regulation_away_goals?: number;
          p_qualified_team_id?: string | null;
          p_advancement_method?: "REGULATION" | "EXTRA_TIME" | "PENALTIES" | null;
          p_home_team_id?: string | null;
          p_away_team_id?: string | null;
          p_depends_on_prediction_refs?: string[];
          p_validation_status?: "valid" | "invalid" | "incomplete";
          p_sync_status?: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
        };
        Returns: string;
      };
      upsert_prediction_tiebreak_override: {
        Args: {
          p_league_id: string;
          p_scope_ref: string;
          p_ordered_team_ids: string[];
          p_reason?: string;
          p_sync_status?: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
        };
        Returns: string;
      };
      upsert_antepost_prediction: {
        Args: {
          p_league_id: string;
          p_definition_id: string;
          p_selected_payload: Json;
          p_sync_status?: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
        };
        Returns: string;
      };
      update_prediction_set_completion: {
        Args: {
          p_league_id: string;
          p_status: "draft" | "complete" | "locked";
          p_total_required: number;
          p_completed_items: number;
          p_unsynced_items?: number;
        };
        Returns: string;
      };
      update_stage_scoring_rule_value: {
        Args: {
          p_league_id: string;
          p_stage: string;
          p_field: string;
          p_value: number;
        };
        Returns: string;
      };
      update_antepost_scoring_rule_value: {
        Args: {
          p_league_id: string;
          p_field: string;
          p_value: number;
        };
        Returns: string;
      };
      lock_scoring_rule_snapshot: {
        Args: {
          p_league_id: string;
        };
        Returns: string;
      };
      persist_scoring_recalculation: {
        Args: {
          p_league_id: string;
          p_source_result_key: string;
          p_calculation_version: string;
          p_events: Json;
          p_leaderboard_entries: Json;
          p_breakdown_items?: Json;
          p_reason?: string;
        };
        Returns: {
          run_id: string;
          snapshot_id: string;
        }[];
      };
      record_trusted_result_ingestion: {
        Args: {
          p_league_id: string;
          p_source_result_key: string;
          p_payload: Json;
          p_status?: "accepted" | "scored" | "failed";
          p_correction_of_source_result_key?: string | null;
          p_error_message?: string | null;
        };
        Returns: string;
      };
      trusted_result_ingestion_exists: {
        Args: {
          p_league_id: string;
          p_source_result_key: string;
        };
        Returns: boolean;
      };
      record_provider_result_import: {
        Args: {
          p_league_id: string;
          p_provider: string;
          p_external_fixture_key: string;
          p_source_result_key: string;
          p_payload: Json;
          p_status?: "accepted" | "scored" | "failed";
          p_correction_of_source_result_key?: string | null;
          p_error_message?: string | null;
          p_retry_attempt?: number;
          p_max_retries?: number;
          p_next_retry_at?: string | null;
        };
        Returns: {
          sync_run_id: string;
          provider_payload_id: string;
          ingestion_run_id: string;
        }[];
      };
      trusted_provider_retry_candidates: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          league_id: string;
          source_result_key: string;
          correction_of_source_result_key: string | null;
          provider: string | null;
          external_fixture_key: string | null;
          retry_attempt: number;
          max_retries: number;
          next_retry_at: string | null;
          error_message: string | null;
        }[];
      };
    };
    Enums: {
      advancement_method: "REGULATION" | "EXTRA_TIME" | "PENALTIES";
      league_member_role: "owner" | "admin" | "participant";
      league_status: "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";
      prediction_set_status: "draft" | "complete" | "locked";
      prediction_sync_status: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
      prediction_validation_status: "valid" | "invalid" | "incomplete";
      rule_version_status: "draft" | "locked";
    };
    CompositeTypes: Record<string, never>;
  };
}
