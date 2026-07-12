export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      antepost_predictions: {
        Row: {
          definition_id: string;
          id: string;
          prediction_set_id: string;
          selected_payload: Json;
          sync_status: Database["public"]["Enums"]["prediction_sync_status"];
          updated_at: string;
        };
        Insert: {
          definition_id: string;
          id?: string;
          prediction_set_id: string;
          selected_payload: Json;
          sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          updated_at?: string;
        };
        Update: {
          definition_id?: string;
          id?: string;
          prediction_set_id?: string;
          selected_payload?: Json;
          sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "antepost_predictions_definition_id_fkey";
            columns: ["definition_id"];
            isOneToOne: false;
            referencedRelation: "competition_antepost_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "antepost_predictions_prediction_set_id_fkey";
            columns: ["prediction_set_id"];
            isOneToOne: false;
            referencedRelation: "prediction_sets";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_log: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          event_payload: Json;
          event_type: string;
          id: string;
          league_id: string | null;
          visible_to_members: boolean;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          event_payload?: Json;
          event_type: string;
          id?: string;
          league_id?: string | null;
          visible_to_members?: boolean;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          event_payload?: Json;
          event_type?: string;
          id?: string;
          league_id?: string | null;
          visible_to_members?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          }
        ];
      };
      bracket_slots: {
        Row: {
          edition_id: string;
          format_template_version_id: string;
          id: string;
          round_id: string;
          slot_key: string;
          source_payload: Json;
          source_type: string;
          target_leg: number;
          target_match_id: string;
          target_node_id: string;
          target_side: string;
        };
        Insert: {
          edition_id: string;
          format_template_version_id: string;
          id?: string;
          round_id: string;
          slot_key: string;
          source_payload: Json;
          source_type: string;
          target_leg?: number;
          target_match_id: string;
          target_node_id: string;
          target_side: string;
        };
        Update: {
          edition_id?: string;
          format_template_version_id?: string;
          id?: string;
          round_id?: string;
          slot_key?: string;
          source_payload?: Json;
          source_type?: string;
          target_leg?: number;
          target_match_id?: string;
          target_node_id?: string;
          target_side?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bracket_slots_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_slots_format_template_version_id_fkey";
            columns: ["format_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_slots_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_slots_target_match_id_fkey";
            columns: ["target_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bracket_slots_target_node_version_fkey";
            columns: ["format_template_version_id", "target_node_id"];
            isOneToOne: false;
            referencedRelation: "format_template_match_nodes";
            referencedColumns: ["format_template_version_id", "id"];
          }
        ];
      };
      competition_antepost_definitions: {
        Row: {
          code: string;
          edition_id: string;
          id: string;
          label: string;
          required: boolean;
          value_type: string;
        };
        Insert: {
          code: string;
          edition_id: string;
          id?: string;
          label: string;
          required?: boolean;
          value_type: string;
        };
        Update: {
          code?: string;
          edition_id?: string;
          id?: string;
          label?: string;
          required?: boolean;
          value_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_antepost_definitions_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          }
        ];
      };
      competition_editions: {
        Row: {
          created_at: string;
          data_completeness: string;
          edition_code: string | null;
          enabled: boolean;
          family_id: string | null;
          first_kickoff_at: string | null;
          format: Json;
          format_template_version_id: string | null;
          id: string;
          maximum_deadline_at: string | null;
          name: string;
          official_rules_source: Json;
          prediction_requirement_version_id: string | null;
          ruleset_version_id: string | null;
          scoring_preset_version_id: string | null;
          season_label: string;
          template_id: string;
        };
        Insert: {
          created_at?: string;
          data_completeness?: string;
          edition_code?: string | null;
          enabled?: boolean;
          family_id?: string | null;
          first_kickoff_at?: string | null;
          format?: Json;
          format_template_version_id?: string | null;
          id?: string;
          maximum_deadline_at?: string | null;
          name: string;
          official_rules_source?: Json;
          prediction_requirement_version_id?: string | null;
          ruleset_version_id?: string | null;
          scoring_preset_version_id?: string | null;
          season_label: string;
          template_id: string;
        };
        Update: {
          created_at?: string;
          data_completeness?: string;
          edition_code?: string | null;
          enabled?: boolean;
          family_id?: string | null;
          first_kickoff_at?: string | null;
          format?: Json;
          format_template_version_id?: string | null;
          id?: string;
          maximum_deadline_at?: string | null;
          name?: string;
          official_rules_source?: Json;
          prediction_requirement_version_id?: string | null;
          ruleset_version_id?: string | null;
          scoring_preset_version_id?: string | null;
          season_label?: string;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_editions_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "competition_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_editions_format_template_version_id_fkey";
            columns: ["format_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_editions_prediction_requirement_version_id_fkey";
            columns: ["prediction_requirement_version_id"];
            isOneToOne: false;
            referencedRelation: "prediction_requirement_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_editions_ruleset_version_id_fkey";
            columns: ["ruleset_version_id"];
            isOneToOne: false;
            referencedRelation: "ruleset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_editions_scoring_preset_version_id_fkey";
            columns: ["scoring_preset_version_id"];
            isOneToOne: false;
            referencedRelation: "scoring_preset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_editions_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "competition_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      competition_families: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          sport_id: string;
          status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          sport_id: string;
          status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          sport_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_families_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          }
        ];
      };
      competition_templates: {
        Row: {
          code: string;
          family_id: string | null;
          id: string;
          name: string;
          sport_id: string;
          status: string;
        };
        Insert: {
          code: string;
          family_id?: string | null;
          id?: string;
          name: string;
          sport_id: string;
          status?: string;
        };
        Update: {
          code?: string;
          family_id?: string | null;
          id?: string;
          name?: string;
          sport_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_templates_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "competition_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_templates_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          }
        ];
      };
      competition_tiebreak_rules: {
        Row: {
          edition_id: string;
          id: string;
          rule_code: string;
          rule_payload: Json;
          scope: string;
          sort_order: number;
        };
        Insert: {
          edition_id: string;
          id?: string;
          rule_code: string;
          rule_payload?: Json;
          scope: string;
          sort_order: number;
        };
        Update: {
          edition_id?: string;
          id?: string;
          rule_code?: string;
          rule_payload?: Json;
          scope?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "competition_tiebreak_rules_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          }
        ];
      };
      edition_teams: {
        Row: {
          edition_id: string;
          seed_group_id: string | null;
          team_id: string;
        };
        Insert: {
          edition_id: string;
          seed_group_id?: string | null;
          team_id: string;
        };
        Update: {
          edition_id?: string;
          seed_group_id?: string | null;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "edition_teams_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "edition_teams_seed_group_id_fkey";
            columns: ["seed_group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "edition_teams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      feature_flags: {
        Row: {
          enabled: boolean;
          key: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          enabled?: boolean;
          key: string;
          payload?: Json;
          updated_at?: string;
        };
        Update: {
          enabled?: boolean;
          key?: string;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      format_template_best_third_assignments: {
        Row: {
          combination_id: string;
          format_template_version_id: string;
          id: string;
          target_node_id: string;
          target_side: string;
          third_place_group_code: string;
          winner_group_code: string;
        };
        Insert: {
          combination_id: string;
          format_template_version_id: string;
          id: string;
          target_node_id: string;
          target_side: string;
          third_place_group_code: string;
          winner_group_code: string;
        };
        Update: {
          combination_id?: string;
          format_template_version_id?: string;
          id?: string;
          target_node_id?: string;
          target_side?: string;
          third_place_group_code?: string;
          winner_group_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "format_template_best_third_as_format_template_version_id_c_fkey";
            columns: ["format_template_version_id", "combination_id"];
            isOneToOne: false;
            referencedRelation: "format_template_best_third_combinations";
            referencedColumns: ["format_template_version_id", "id"];
          },
          {
            foreignKeyName: "format_template_best_third_as_format_template_version_id_t_fkey";
            columns: ["format_template_version_id", "target_node_id"];
            isOneToOne: false;
            referencedRelation: "format_template_match_nodes";
            referencedColumns: ["format_template_version_id", "id"];
          },
          {
            foreignKeyName: "format_template_best_third_assi_format_template_version_id_fkey";
            columns: ["format_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      format_template_best_third_combinations: {
        Row: {
          combination_key: string;
          edition_id: string;
          format_template_version_id: string;
          id: string;
          option_number: number;
          qualified_group_codes: string[];
        };
        Insert: {
          combination_key: string;
          edition_id: string;
          format_template_version_id: string;
          id: string;
          option_number: number;
          qualified_group_codes: string[];
        };
        Update: {
          combination_key?: string;
          edition_id?: string;
          format_template_version_id?: string;
          id?: string;
          option_number?: number;
          qualified_group_codes?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "format_template_best_third_comb_format_template_version_id_fkey";
            columns: ["format_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_best_third_combinations_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          }
        ];
      };
      format_template_match_nodes: {
        Row: {
          edition_id: string;
          format_template_version_id: string;
          id: string;
          node_key: string;
          round_id: string;
          sort_order: number;
          target_match_id: string;
        };
        Insert: {
          edition_id: string;
          format_template_version_id: string;
          id: string;
          node_key: string;
          round_id: string;
          sort_order: number;
          target_match_id: string;
        };
        Update: {
          edition_id?: string;
          format_template_version_id?: string;
          id?: string;
          node_key?: string;
          round_id?: string;
          sort_order?: number;
          target_match_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "format_template_match_nodes_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_match_nodes_format_template_version_id_fkey";
            columns: ["format_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_match_nodes_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_match_nodes_target_match_id_fkey";
            columns: ["target_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ];
      };
      format_template_versions: {
        Row: {
          bracket_mapping_strategy: string;
          competition_edition_id: string | null;
          competition_family_id: string;
          competition_template_id: string;
          created_at: string;
          format: Json;
          id: string;
          official_rules_source: Json;
          ranking_rule_sets: Json;
          stages: Json;
          status: string;
          supersedes_template_version_id: string | null;
          valid_from: string;
          valid_to: string | null;
          version: string;
        };
        Insert: {
          bracket_mapping_strategy: string;
          competition_edition_id?: string | null;
          competition_family_id: string;
          competition_template_id: string;
          created_at?: string;
          format: Json;
          id?: string;
          official_rules_source?: Json;
          ranking_rule_sets?: Json;
          stages?: Json;
          status?: string;
          supersedes_template_version_id?: string | null;
          valid_from: string;
          valid_to?: string | null;
          version: string;
        };
        Update: {
          bracket_mapping_strategy?: string;
          competition_edition_id?: string | null;
          competition_family_id?: string;
          competition_template_id?: string;
          created_at?: string;
          format?: Json;
          id?: string;
          official_rules_source?: Json;
          ranking_rule_sets?: Json;
          stages?: Json;
          status?: string;
          supersedes_template_version_id?: string | null;
          valid_from?: string;
          valid_to?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "format_template_versions_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_versions_competition_family_id_fkey";
            columns: ["competition_family_id"];
            isOneToOne: false;
            referencedRelation: "competition_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_versions_competition_template_id_fkey";
            columns: ["competition_template_id"];
            isOneToOne: false;
            referencedRelation: "competition_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "format_template_versions_supersedes_template_version_id_fkey";
            columns: ["supersedes_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      groups: {
        Row: {
          code: string;
          edition_id: string;
          id: string;
          name: string;
          sort_order: number;
          stage_id: string;
        };
        Insert: {
          code: string;
          edition_id: string;
          id?: string;
          name: string;
          sort_order: number;
          stage_id: string;
        };
        Update: {
          code?: string;
          edition_id?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          stage_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "groups_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          }
        ];
      };
      leaderboard_entries: {
        Row: {
          latest_points: number;
          position_delta: number;
          rank: number;
          snapshot_id: string;
          tied: boolean;
          total_points: number;
          user_id: string;
        };
        Insert: {
          latest_points?: number;
          position_delta?: number;
          rank: number;
          snapshot_id: string;
          tied?: boolean;
          total_points: number;
          user_id: string;
        };
        Update: {
          latest_points?: number;
          position_delta?: number;
          rank?: number;
          snapshot_id?: string;
          tied?: boolean;
          total_points?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_snapshots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      leaderboard_snapshots: {
        Row: {
          created_at: string;
          id: string;
          league_id: string;
          snapshot_key: string;
          source_result_key: string;
          source_result_version_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          league_id: string;
          snapshot_key: string;
          source_result_key?: string;
          source_result_version_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          league_id?: string;
          snapshot_key?: string;
          source_result_key?: string;
          source_result_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_snapshots_source_result_version_id_fkey";
            columns: ["source_result_version_id"];
            isOneToOne: false;
            referencedRelation: "match_result_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      league_invites: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string | null;
          hashed_token: string;
          id: string;
          league_id: string;
          max_uses: number | null;
          revoked_at: string | null;
          uses: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          hashed_token: string;
          id?: string;
          league_id: string;
          max_uses?: number | null;
          revoked_at?: string | null;
          uses?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          hashed_token?: string;
          id?: string;
          league_id?: string;
          max_uses?: number | null;
          revoked_at?: string | null;
          uses?: number;
        };
        Relationships: [
          {
            foreignKeyName: "league_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_invites_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          }
        ];
      };
      league_members: {
        Row: {
          joined_at: string;
          league_id: string;
          removed_at: string | null;
          role: Database["public"]["Enums"]["league_member_role"];
          status: Database["public"]["Enums"]["member_status"];
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          league_id: string;
          removed_at?: string | null;
          role?: Database["public"]["Enums"]["league_member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          user_id: string;
        };
        Update: {
          joined_at?: string;
          league_id?: string;
          removed_at?: string | null;
          role?: Database["public"]["Enums"]["league_member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      league_scoring_rule_changes: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          field: string;
          id: string;
          league_id: string;
          next_value: number;
          previous_value: number;
          rule_version_id: string;
          scope: string;
          stage: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          field: string;
          id?: string;
          league_id: string;
          next_value: number;
          previous_value: number;
          rule_version_id: string;
          scope: string;
          stage?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          field?: string;
          id?: string;
          league_id?: string;
          next_value?: number;
          previous_value?: number;
          rule_version_id?: string;
          scope?: string;
          stage?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "league_scoring_rule_changes_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_scoring_rule_changes_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_scoring_rule_changes_rule_version_id_fkey";
            columns: ["rule_version_id"];
            isOneToOne: false;
            referencedRelation: "league_scoring_rule_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      league_scoring_rule_versions: {
        Row: {
          checksum: string | null;
          config: Json;
          created_at: string;
          created_by: string | null;
          id: string;
          league_id: string;
          locked_at: string | null;
          schema_version: number;
          status: Database["public"]["Enums"]["rule_version_status"];
          version: number;
        };
        Insert: {
          checksum?: string | null;
          config: Json;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          league_id: string;
          locked_at?: string | null;
          schema_version: number;
          status: Database["public"]["Enums"]["rule_version_status"];
          version: number;
        };
        Update: {
          checksum?: string | null;
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          league_id?: string;
          locked_at?: string | null;
          schema_version?: number;
          status?: Database["public"]["Enums"]["rule_version_status"];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "league_scoring_rule_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_scoring_rule_versions_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          }
        ];
      };
      leagues: {
        Row: {
          competition_edition_id: string;
          created_at: string;
          current_scoring_rule_version_id: string | null;
          deadline_at: string;
          format_template_version_id: string | null;
          id: string;
          invite_settings: Json;
          locked_competition_snapshot: Json | null;
          locked_competition_snapshot_checksum: string | null;
          name: string;
          owner_id: string;
          prediction_requirement_version_id: string | null;
          ruleset_version_id: string | null;
          scoring_preset_version_id: string | null;
          status: Database["public"]["Enums"]["league_status"];
          updated_at: string;
        };
        Insert: {
          competition_edition_id: string;
          created_at?: string;
          current_scoring_rule_version_id?: string | null;
          deadline_at: string;
          format_template_version_id?: string | null;
          id?: string;
          invite_settings?: Json;
          locked_competition_snapshot?: Json | null;
          locked_competition_snapshot_checksum?: string | null;
          name: string;
          owner_id: string;
          prediction_requirement_version_id?: string | null;
          ruleset_version_id?: string | null;
          scoring_preset_version_id?: string | null;
          status?: Database["public"]["Enums"]["league_status"];
          updated_at?: string;
        };
        Update: {
          competition_edition_id?: string;
          created_at?: string;
          current_scoring_rule_version_id?: string | null;
          deadline_at?: string;
          format_template_version_id?: string | null;
          id?: string;
          invite_settings?: Json;
          locked_competition_snapshot?: Json | null;
          locked_competition_snapshot_checksum?: string | null;
          name?: string;
          owner_id?: string;
          prediction_requirement_version_id?: string | null;
          ruleset_version_id?: string | null;
          scoring_preset_version_id?: string | null;
          status?: Database["public"]["Enums"]["league_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leagues_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_current_rule_fk";
            columns: ["current_scoring_rule_version_id"];
            isOneToOne: false;
            referencedRelation: "league_scoring_rule_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_format_template_version_id_fkey";
            columns: ["format_template_version_id"];
            isOneToOne: false;
            referencedRelation: "format_template_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_prediction_requirement_version_id_fkey";
            columns: ["prediction_requirement_version_id"];
            isOneToOne: false;
            referencedRelation: "prediction_requirement_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_ruleset_version_id_fkey";
            columns: ["ruleset_version_id"];
            isOneToOne: false;
            referencedRelation: "ruleset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_scoring_preset_version_id_fkey";
            columns: ["scoring_preset_version_id"];
            isOneToOne: false;
            referencedRelation: "scoring_preset_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      match_predictions: {
        Row: {
          advancement_method: Database["public"]["Enums"]["advancement_method"] | null;
          away_team_id: string | null;
          depends_on_prediction_refs: string[];
          home_team_id: string | null;
          id: string;
          match_id: string | null;
          prediction_ref: string;
          prediction_set_id: string;
          qualified_team_id: string | null;
          regulation_away_goals: number;
          regulation_home_goals: number;
          stage_code: string;
          sync_status: Database["public"]["Enums"]["prediction_sync_status"];
          updated_at: string;
          validation_status: Database["public"]["Enums"]["prediction_validation_status"];
        };
        Insert: {
          advancement_method?: Database["public"]["Enums"]["advancement_method"] | null;
          away_team_id?: string | null;
          depends_on_prediction_refs?: string[];
          home_team_id?: string | null;
          id?: string;
          match_id?: string | null;
          prediction_ref: string;
          prediction_set_id: string;
          qualified_team_id?: string | null;
          regulation_away_goals: number;
          regulation_home_goals: number;
          stage_code?: string;
          sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          updated_at?: string;
          validation_status?: Database["public"]["Enums"]["prediction_validation_status"];
        };
        Update: {
          advancement_method?: Database["public"]["Enums"]["advancement_method"] | null;
          away_team_id?: string | null;
          depends_on_prediction_refs?: string[];
          home_team_id?: string | null;
          id?: string;
          match_id?: string | null;
          prediction_ref?: string;
          prediction_set_id?: string;
          qualified_team_id?: string | null;
          regulation_away_goals?: number;
          regulation_home_goals?: number;
          stage_code?: string;
          sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          updated_at?: string;
          validation_status?: Database["public"]["Enums"]["prediction_validation_status"];
        };
        Relationships: [
          {
            foreignKeyName: "match_predictions_away_team_id_fkey";
            columns: ["away_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_predictions_home_team_id_fkey";
            columns: ["home_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_predictions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_predictions_prediction_set_id_fkey";
            columns: ["prediction_set_id"];
            isOneToOne: false;
            referencedRelation: "prediction_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_predictions_qualified_team_id_fkey";
            columns: ["qualified_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      match_result_versions: {
        Row: {
          advancement_method: Database["public"]["Enums"]["advancement_method"] | null;
          away_score_90: number | null;
          extra_time_payload: Json | null;
          home_score_90: number | null;
          id: string;
          match_id: string;
          penalty_payload: Json | null;
          provider_updated_at: string | null;
          qualified_team_id: string | null;
          received_at: string;
          source_payload_id: string | null;
          status: Database["public"]["Enums"]["match_status"];
          version: number;
        };
        Insert: {
          advancement_method?: Database["public"]["Enums"]["advancement_method"] | null;
          away_score_90?: number | null;
          extra_time_payload?: Json | null;
          home_score_90?: number | null;
          id?: string;
          match_id: string;
          penalty_payload?: Json | null;
          provider_updated_at?: string | null;
          qualified_team_id?: string | null;
          received_at?: string;
          source_payload_id?: string | null;
          status: Database["public"]["Enums"]["match_status"];
          version: number;
        };
        Update: {
          advancement_method?: Database["public"]["Enums"]["advancement_method"] | null;
          away_score_90?: number | null;
          extra_time_payload?: Json | null;
          home_score_90?: number | null;
          id?: string;
          match_id?: string;
          penalty_payload?: Json | null;
          provider_updated_at?: string | null;
          qualified_team_id?: string | null;
          received_at?: string;
          source_payload_id?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_result_versions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_result_versions_qualified_team_id_fkey";
            columns: ["qualified_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_result_versions_source_payload_id_fkey";
            columns: ["source_payload_id"];
            isOneToOne: false;
            referencedRelation: "provider_payloads";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          away_team_id: string | null;
          bracket_payload: Json;
          edition_id: string;
          group_id: string | null;
          home_team_id: string | null;
          id: string;
          kickoff_at: string | null;
          round_id: string | null;
          sort_order: number;
          stage_id: string;
          status: Database["public"]["Enums"]["match_status"];
        };
        Insert: {
          away_team_id?: string | null;
          bracket_payload?: Json;
          edition_id: string;
          group_id?: string | null;
          home_team_id?: string | null;
          id?: string;
          kickoff_at?: string | null;
          round_id?: string | null;
          sort_order: number;
          stage_id: string;
          status?: Database["public"]["Enums"]["match_status"];
        };
        Update: {
          away_team_id?: string | null;
          bracket_payload?: Json;
          edition_id?: string;
          group_id?: string | null;
          home_team_id?: string | null;
          id?: string;
          kickoff_at?: string | null;
          round_id?: string | null;
          sort_order?: number;
          stage_id?: string;
          status?: Database["public"]["Enums"]["match_status"];
        };
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey";
            columns: ["away_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_home_team_id_fkey";
            columns: ["home_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          body: string;
          category: string;
          created_at: string;
          id: string;
          league_id: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          category: string;
          created_at?: string;
          id?: string;
          league_id?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          league_id?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      players: {
        Row: {
          display_name: string;
          id: string;
          team_id: string | null;
        };
        Insert: {
          display_name: string;
          id?: string;
          team_id?: string | null;
        };
        Update: {
          display_name?: string;
          id?: string;
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      prediction_requirement_versions: {
        Row: {
          competition_edition_id: string | null;
          competition_family_id: string;
          created_at: string;
          id: string;
          requirements: Json;
          status: string;
          valid_from: string;
          valid_to: string | null;
          version: string;
        };
        Insert: {
          competition_edition_id?: string | null;
          competition_family_id: string;
          created_at?: string;
          id?: string;
          requirements?: Json;
          status?: string;
          valid_from: string;
          valid_to?: string | null;
          version: string;
        };
        Update: {
          competition_edition_id?: string | null;
          competition_family_id?: string;
          created_at?: string;
          id?: string;
          requirements?: Json;
          status?: string;
          valid_from?: string;
          valid_to?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_requirement_versions_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prediction_requirement_versions_competition_family_id_fkey";
            columns: ["competition_family_id"];
            isOneToOne: false;
            referencedRelation: "competition_families";
            referencedColumns: ["id"];
          }
        ];
      };
      prediction_sets: {
        Row: {
          completed_at: string | null;
          completed_items: number;
          id: string;
          last_server_synced_at: string | null;
          league_id: string;
          status: Database["public"]["Enums"]["prediction_set_status"];
          total_required: number;
          unsynced_items: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_items?: number;
          id?: string;
          last_server_synced_at?: string | null;
          league_id: string;
          status?: Database["public"]["Enums"]["prediction_set_status"];
          total_required?: number;
          unsynced_items?: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_items?: number;
          id?: string;
          last_server_synced_at?: string | null;
          league_id?: string;
          status?: Database["public"]["Enums"]["prediction_set_status"];
          total_required?: number;
          unsynced_items?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_sets_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prediction_sets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      prediction_tiebreak_overrides: {
        Row: {
          affected_positions: number[];
          created_at: string;
          id: string;
          ordered_team_ids: string[];
          prediction_set_id: string;
          reason: string;
          scope: string;
          scope_ref: string;
          sync_status: Database["public"]["Enums"]["prediction_sync_status"];
          tie_group_id: string;
          tied_team_ids: string[];
          updated_at: string;
        };
        Insert: {
          affected_positions?: number[];
          created_at?: string;
          id?: string;
          ordered_team_ids: string[];
          prediction_set_id: string;
          reason: string;
          scope?: string;
          scope_ref: string;
          sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          tie_group_id: string;
          tied_team_ids?: string[];
          updated_at?: string;
        };
        Update: {
          affected_positions?: number[];
          created_at?: string;
          id?: string;
          ordered_team_ids?: string[];
          prediction_set_id?: string;
          reason?: string;
          scope?: string;
          scope_ref?: string;
          sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          tie_group_id?: string;
          tied_team_ids?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prediction_tiebreak_overrides_prediction_set_id_fkey";
            columns: ["prediction_set_id"];
            isOneToOne: false;
            referencedRelation: "prediction_sets";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_mappings: {
        Row: {
          entity_type: string;
          external_id: string;
          id: string;
          local_entity_id: string;
          provider: string;
        };
        Insert: {
          entity_type: string;
          external_id: string;
          id?: string;
          local_entity_id: string;
          provider: string;
        };
        Update: {
          entity_type?: string;
          external_id?: string;
          id?: string;
          local_entity_id?: string;
          provider?: string;
        };
        Relationships: [];
      };
      provider_payloads: {
        Row: {
          correction_of_source_result_key: string | null;
          external_id: string;
          id: string;
          payload: Json;
          payload_kind: string;
          provider: string;
          received_at: string;
          source_result_key: string | null;
          sync_run_id: string | null;
        };
        Insert: {
          correction_of_source_result_key?: string | null;
          external_id: string;
          id?: string;
          payload: Json;
          payload_kind?: string;
          provider: string;
          received_at?: string;
          source_result_key?: string | null;
          sync_run_id?: string | null;
        };
        Update: {
          correction_of_source_result_key?: string | null;
          external_id?: string;
          id?: string;
          payload?: Json;
          payload_kind?: string;
          provider?: string;
          received_at?: string;
          source_result_key?: string | null;
          sync_run_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "provider_payloads_sync_run_id_fkey";
            columns: ["sync_run_id"];
            isOneToOne: false;
            referencedRelation: "sync_runs";
            referencedColumns: ["id"];
          }
        ];
      };
      public_user_profiles: {
        Row: {
          avatar_url: string | null;
          display_name: string;
          updated_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          display_name: string;
          updated_at?: string;
          user_id: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          display_name?: string;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "public_user_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          last_seen_at: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_seen_at?: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      result_ingestion_runs: {
        Row: {
          completed_at: string | null;
          correction_of_source_result_key: string | null;
          correction_status: string;
          created_at: string;
          error_message: string | null;
          external_fixture_key: string | null;
          failure_kind: string;
          id: string;
          league_id: string;
          max_retries: number;
          next_retry_at: string | null;
          payload: Json;
          provider: string | null;
          provider_payload_id: string | null;
          retry_attempt: number;
          source_result_key: string;
          status: string;
          sync_run_id: string | null;
          trusted_actor: string;
        };
        Insert: {
          completed_at?: string | null;
          correction_of_source_result_key?: string | null;
          correction_status?: string;
          created_at?: string;
          error_message?: string | null;
          external_fixture_key?: string | null;
          failure_kind?: string;
          id?: string;
          league_id: string;
          max_retries?: number;
          next_retry_at?: string | null;
          payload: Json;
          provider?: string | null;
          provider_payload_id?: string | null;
          retry_attempt?: number;
          source_result_key: string;
          status: string;
          sync_run_id?: string | null;
          trusted_actor?: string;
        };
        Update: {
          completed_at?: string | null;
          correction_of_source_result_key?: string | null;
          correction_status?: string;
          created_at?: string;
          error_message?: string | null;
          external_fixture_key?: string | null;
          failure_kind?: string;
          id?: string;
          league_id?: string;
          max_retries?: number;
          next_retry_at?: string | null;
          payload?: Json;
          provider?: string | null;
          provider_payload_id?: string | null;
          retry_attempt?: number;
          source_result_key?: string;
          status?: string;
          sync_run_id?: string | null;
          trusted_actor?: string;
        };
        Relationships: [
          {
            foreignKeyName: "result_ingestion_runs_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_ingestion_runs_provider_payload_id_fkey";
            columns: ["provider_payload_id"];
            isOneToOne: false;
            referencedRelation: "provider_payloads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_ingestion_runs_sync_run_id_fkey";
            columns: ["sync_run_id"];
            isOneToOne: false;
            referencedRelation: "sync_runs";
            referencedColumns: ["id"];
          }
        ];
      };
      rounds: {
        Row: {
          code: string;
          edition_id: string;
          id: string;
          name: string;
          sort_order: number;
          stage_id: string;
        };
        Insert: {
          code: string;
          edition_id: string;
          id?: string;
          name: string;
          sort_order: number;
          stage_id: string;
        };
        Update: {
          code?: string;
          edition_id?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          stage_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rounds_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rounds_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "stages";
            referencedColumns: ["id"];
          }
        ];
      };
      ruleset_versions: {
        Row: {
          competition_edition_id: string | null;
          competition_family_id: string;
          created_at: string;
          id: string;
          official_rules_source: Json;
          ranking_rule_set_codes: string[];
          rules_payload: Json;
          status: string;
          valid_from: string;
          valid_to: string | null;
          version: string;
        };
        Insert: {
          competition_edition_id?: string | null;
          competition_family_id: string;
          created_at?: string;
          id?: string;
          official_rules_source?: Json;
          ranking_rule_set_codes?: string[];
          rules_payload?: Json;
          status?: string;
          valid_from: string;
          valid_to?: string | null;
          version: string;
        };
        Update: {
          competition_edition_id?: string | null;
          competition_family_id?: string;
          created_at?: string;
          id?: string;
          official_rules_source?: Json;
          ranking_rule_set_codes?: string[];
          rules_payload?: Json;
          status?: string;
          valid_from?: string;
          valid_to?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ruleset_versions_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ruleset_versions_competition_family_id_fkey";
            columns: ["competition_family_id"];
            isOneToOne: false;
            referencedRelation: "competition_families";
            referencedColumns: ["id"];
          }
        ];
      };
      scoring_breakdown_items: {
        Row: {
          breakdown_key: string;
          created_at: string;
          event_type: string;
          id: string;
          league_id: string;
          participant_user_id: string;
          points: number;
          reason: string;
          reference_id: string;
          scope: string;
          scoring_event_id: string | null;
          source_result_key: string;
          stage: string | null;
        };
        Insert: {
          breakdown_key: string;
          created_at?: string;
          event_type: string;
          id?: string;
          league_id: string;
          participant_user_id: string;
          points: number;
          reason: string;
          reference_id: string;
          scope: string;
          scoring_event_id?: string | null;
          source_result_key: string;
          stage?: string | null;
        };
        Update: {
          breakdown_key?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          league_id?: string;
          participant_user_id?: string;
          points?: number;
          reason?: string;
          reference_id?: string;
          scope?: string;
          scoring_event_id?: string | null;
          source_result_key?: string;
          stage?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_breakdown_items_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_breakdown_items_participant_user_id_fkey";
            columns: ["participant_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_breakdown_items_scoring_event_id_fkey";
            columns: ["scoring_event_id"];
            isOneToOne: false;
            referencedRelation: "scoring_events";
            referencedColumns: ["id"];
          }
        ];
      };
      scoring_events: {
        Row: {
          calculation_version: string;
          competition_edition_id: string;
          created_at: string;
          event_key: string;
          event_type: string;
          id: string;
          league_id: string;
          participant_user_id: string;
          points: number;
          reason: string;
          reference_id: string;
          scoring_rule_version_id: string;
          source_result_key: string;
          source_result_version_id: string | null;
        };
        Insert: {
          calculation_version: string;
          competition_edition_id: string;
          created_at?: string;
          event_key: string;
          event_type: string;
          id?: string;
          league_id: string;
          participant_user_id: string;
          points: number;
          reason: string;
          reference_id: string;
          scoring_rule_version_id: string;
          source_result_key?: string;
          source_result_version_id?: string | null;
        };
        Update: {
          calculation_version?: string;
          competition_edition_id?: string;
          created_at?: string;
          event_key?: string;
          event_type?: string;
          id?: string;
          league_id?: string;
          participant_user_id?: string;
          points?: number;
          reason?: string;
          reference_id?: string;
          scoring_rule_version_id?: string;
          source_result_key?: string;
          source_result_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_events_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_events_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_events_participant_user_id_fkey";
            columns: ["participant_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_events_scoring_rule_version_id_fkey";
            columns: ["scoring_rule_version_id"];
            isOneToOne: false;
            referencedRelation: "league_scoring_rule_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_events_source_result_version_id_fkey";
            columns: ["source_result_version_id"];
            isOneToOne: false;
            referencedRelation: "match_result_versions";
            referencedColumns: ["id"];
          }
        ];
      };
      scoring_preset_versions: {
        Row: {
          competition_edition_id: string | null;
          competition_family_id: string;
          competition_template_id: string | null;
          config: Json;
          created_at: string;
          id: string;
          preset_code: string;
          status: string;
          valid_from: string;
          valid_to: string | null;
          version: string;
        };
        Insert: {
          competition_edition_id?: string | null;
          competition_family_id: string;
          competition_template_id?: string | null;
          config: Json;
          created_at?: string;
          id?: string;
          preset_code: string;
          status?: string;
          valid_from: string;
          valid_to?: string | null;
          version: string;
        };
        Update: {
          competition_edition_id?: string | null;
          competition_family_id?: string;
          competition_template_id?: string | null;
          config?: Json;
          created_at?: string;
          id?: string;
          preset_code?: string;
          status?: string;
          valid_from?: string;
          valid_to?: string | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_preset_versions_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_preset_versions_competition_family_id_fkey";
            columns: ["competition_family_id"];
            isOneToOne: false;
            referencedRelation: "competition_families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_preset_versions_competition_template_id_fkey";
            columns: ["competition_template_id"];
            isOneToOne: false;
            referencedRelation: "competition_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      scoring_presets: {
        Row: {
          active: boolean;
          competition_edition_id: string | null;
          competition_template_id: string | null;
          config: Json;
          created_at: string;
          id: string;
          name: string;
          schema_version: number;
        };
        Insert: {
          active?: boolean;
          competition_edition_id?: string | null;
          competition_template_id?: string | null;
          config: Json;
          created_at?: string;
          id?: string;
          name: string;
          schema_version: number;
        };
        Update: {
          active?: boolean;
          competition_edition_id?: string | null;
          competition_template_id?: string | null;
          config?: Json;
          created_at?: string;
          id?: string;
          name?: string;
          schema_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_presets_competition_edition_id_fkey";
            columns: ["competition_edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_presets_competition_template_id_fkey";
            columns: ["competition_template_id"];
            isOneToOne: false;
            referencedRelation: "competition_templates";
            referencedColumns: ["id"];
          }
        ];
      };
      scoring_recalculation_runs: {
        Row: {
          actor_user_id: string | null;
          finished_at: string | null;
          id: string;
          league_id: string;
          reason: string;
          snapshot_id: string | null;
          source_result_key: string | null;
          started_at: string;
          status: string;
        };
        Insert: {
          actor_user_id?: string | null;
          finished_at?: string | null;
          id?: string;
          league_id: string;
          reason: string;
          snapshot_id?: string | null;
          source_result_key?: string | null;
          started_at?: string;
          status: string;
        };
        Update: {
          actor_user_id?: string | null;
          finished_at?: string | null;
          id?: string;
          league_id?: string;
          reason?: string;
          snapshot_id?: string | null;
          source_result_key?: string | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_recalculation_runs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_recalculation_runs_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_recalculation_runs_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard_snapshots";
            referencedColumns: ["id"];
          }
        ];
      };
      sports: {
        Row: {
          code: string;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      stages: {
        Row: {
          code: string;
          edition_id: string;
          id: string;
          kind: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          edition_id: string;
          id?: string;
          kind: string;
          name: string;
          sort_order: number;
        };
        Update: {
          code?: string;
          edition_id?: string;
          id?: string;
          kind?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stages_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "competition_editions";
            referencedColumns: ["id"];
          }
        ];
      };
      sync_runs: {
        Row: {
          correction_of_source_result_key: string | null;
          error_message: string | null;
          external_fixture_key: string | null;
          failure_kind: string;
          finished_at: string | null;
          id: string;
          max_retries: number;
          next_retry_at: string | null;
          provider: string;
          retry_attempt: number;
          source_result_key: string | null;
          started_at: string;
          status: string;
          sync_type: string;
        };
        Insert: {
          correction_of_source_result_key?: string | null;
          error_message?: string | null;
          external_fixture_key?: string | null;
          failure_kind?: string;
          finished_at?: string | null;
          id?: string;
          max_retries?: number;
          next_retry_at?: string | null;
          provider: string;
          retry_attempt?: number;
          source_result_key?: string | null;
          started_at?: string;
          status: string;
          sync_type: string;
        };
        Update: {
          correction_of_source_result_key?: string | null;
          error_message?: string | null;
          external_fixture_key?: string | null;
          failure_kind?: string;
          finished_at?: string | null;
          id?: string;
          max_retries?: number;
          next_retry_at?: string | null;
          provider?: string;
          retry_attempt?: number;
          source_result_key?: string | null;
          started_at?: string;
          status?: string;
          sync_type?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          country_code: string | null;
          id: string;
          name: string;
          short_name: string;
        };
        Insert: {
          country_code?: string | null;
          id?: string;
          name: string;
          short_name: string;
        };
        Update: {
          country_code?: string | null;
          id?: string;
          name?: string;
          short_name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      build_league_competition_snapshot: {
        Args: { p_league_id: string };
        Returns: Json;
      };
      calculate_scoring_rule_checksum: {
        Args: { p_config: Json };
        Returns: string;
      };
      calculate_template_snapshot_checksum: {
        Args: { p_payload: Json };
        Returns: string;
      };
      create_league_invite: {
        Args: {
          p_expires_at?: string;
          p_league_id: string;
          p_max_uses?: number;
        };
        Returns: {
          expires_at: string;
          invite_id: string;
          token: string;
        }[];
      };
      create_private_league: {
        Args: {
          p_competition_edition_id: string;
          p_deadline_at: string;
          p_name: string;
          p_scoring_preset_id?: string;
        };
        Returns: string;
      };
      current_user_is_league_member: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      current_user_is_league_owner: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      current_user_is_league_owner_or_admin: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      current_user_league_role: {
        Args: { p_league_id: string };
        Returns: Database["public"]["Enums"]["league_member_role"];
      };
      current_user_prediction_set_id: {
        Args: { p_league_id: string };
        Returns: string;
      };
      ensure_current_user_profile: { Args: never; Returns: undefined };
      generate_invite_token: { Args: never; Returns: string };
      get_prediction_target_catalog: {
        Args: { p_league_id: string };
        Returns: Json;
      };
      hash_invite_token: { Args: { p_token: string }; Returns: string };
      join_league_by_invite: { Args: { p_token: string }; Returns: string };
      league_accepts_members: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      league_accepts_predictions: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      lock_due_leagues: { Args: never; Returns: number };
      lock_league: { Args: { p_league_id: string }; Returns: undefined };
      lock_scoring_rule_snapshot: {
        Args: { p_league_id: string };
        Returns: string;
      };
      official_world_cup_2026_best_third_matrix: {
        Args: never;
        Returns: {
          one_a: string;
          one_b: string;
          one_d: string;
          one_e: string;
          one_g: string;
          one_i: string;
          one_k: string;
          one_l: string;
          option_number: number;
        }[];
      };
      persist_scoring_recalculation: {
        Args: {
          p_breakdown_items?: Json;
          p_calculation_version: string;
          p_events: Json;
          p_leaderboard_entries: Json;
          p_league_id: string;
          p_reason?: string;
          p_source_result_key: string;
        };
        Returns: {
          run_id: string;
          snapshot_id: string;
        }[];
      };
      populate_supported_bracket_destination_catalog: {
        Args: { p_format_version_id: string };
        Returns: undefined;
      };
      populate_world_cup_2026_best_third_matrix: {
        Args: { p_format_version_id: string };
        Returns: undefined;
      };
      predicte_catalog_uuid: { Args: { p_key: string }; Returns: string };
      prediction_set_is_visible: {
        Args: { p_prediction_set_id: string };
        Returns: boolean;
      };
      prediction_set_is_writable_by_current_user: {
        Args: { p_prediction_set_id: string };
        Returns: boolean;
      };
      record_provider_result_import: {
        Args: {
          p_correction_of_source_result_key?: string;
          p_error_message?: string;
          p_external_fixture_key: string;
          p_league_id: string;
          p_max_retries?: number;
          p_next_retry_at?: string;
          p_payload: Json;
          p_provider: string;
          p_retry_attempt?: number;
          p_source_result_key: string;
          p_status?: string;
        };
        Returns: {
          ingestion_run_id: string;
          provider_payload_id: string;
          sync_run_id: string;
        }[];
      };
      record_trusted_result_ingestion: {
        Args: {
          p_correction_of_source_result_key?: string;
          p_error_message?: string;
          p_league_id: string;
          p_payload: Json;
          p_source_result_key: string;
          p_status?: string;
        };
        Returns: string;
      };
      remove_league_member: {
        Args: { p_league_id: string; p_user_id: string };
        Returns: undefined;
      };
      safe_public_profile_display_name: {
        Args: { p_display_name: string; p_user_id: string };
        Returns: string;
      };
      save_match_prediction: {
        Args: {
          p_advancement_method?: Database["public"]["Enums"]["advancement_method"];
          p_away_team_id?: string;
          p_depends_on_prediction_refs?: string[];
          p_home_team_id?: string;
          p_league_id: string;
          p_match_id?: string;
          p_prediction_ref?: string;
          p_qualified_team_id?: string;
          p_regulation_away_goals?: number;
          p_regulation_home_goals?: number;
          p_stage_code?: string;
          p_sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          p_validation_status?: Database["public"]["Enums"]["prediction_validation_status"];
        };
        Returns: string;
      };
      set_league_member_role: {
        Args: {
          p_league_id: string;
          p_role: Database["public"]["Enums"]["league_member_role"];
          p_user_id: string;
        };
        Returns: undefined;
      };
      trusted_provider_retry_candidates: {
        Args: { p_limit?: number };
        Returns: {
          correction_of_source_result_key: string;
          error_message: string;
          external_fixture_key: string;
          league_id: string;
          max_retries: number;
          next_retry_at: string;
          provider: string;
          retry_attempt: number;
          source_result_key: string;
        }[];
      };
      trusted_result_ingestion_exists: {
        Args: { p_league_id: string; p_source_result_key: string };
        Returns: boolean;
      };
      update_antepost_scoring_rule_value: {
        Args: { p_field: string; p_league_id: string; p_value: number };
        Returns: string;
      };
      update_league_deadline: {
        Args: { p_deadline_at: string; p_league_id: string };
        Returns: undefined;
      };
      update_prediction_set_completion: {
        Args: {
          p_completed_items: number;
          p_league_id: string;
          p_status: Database["public"]["Enums"]["prediction_set_status"];
          p_total_required: number;
          p_unsynced_items?: number;
        };
        Returns: string;
      };
      update_stage_scoring_rule_value: {
        Args: {
          p_field: string;
          p_league_id: string;
          p_stage: string;
          p_value: number;
        };
        Returns: string;
      };
      upsert_antepost_prediction: {
        Args: {
          p_definition_id: string;
          p_league_id: string;
          p_selected_payload: Json;
          p_sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
        };
        Returns: string;
      };
      upsert_official_world_cup_bracket_slot: {
        Args: {
          p_format_version_id: string;
          p_node_key: string;
          p_source_payload: Json;
          p_source_type: string;
          p_target_side: string;
        };
        Returns: undefined;
      };
      upsert_prediction_tiebreak_override: {
        Args: {
          p_affected_positions?: number[];
          p_league_id: string;
          p_ordered_team_ids: string[];
          p_reason?: string;
          p_scope?: string;
          p_scope_ref: string;
          p_sync_status?: Database["public"]["Enums"]["prediction_sync_status"];
          p_tie_group_id?: string;
          p_tied_team_ids?: string[];
        };
        Returns: string;
      };
    };
    Enums: {
      advancement_method: "REGULATION" | "EXTRA_TIME" | "PENALTIES";
      league_member_role: "owner" | "admin" | "participant";
      league_status: "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";
      match_status:
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
      member_status: "active" | "removed";
      prediction_set_status: "draft" | "complete" | "locked";
      prediction_sync_status: "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";
      prediction_validation_status: "valid" | "invalid" | "incomplete";
      rule_version_status: "draft" | "locked";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      advancement_method: ["REGULATION", "EXTRA_TIME", "PENALTIES"],
      league_member_role: ["owner", "admin", "participant"],
      league_status: ["draft", "open", "locked", "live", "completed", "archived", "cancelled"],
      match_status: [
        "NOT_STARTED",
        "LIVE",
        "HALFTIME",
        "FULL_TIME",
        "AFTER_EXTRA_TIME",
        "AFTER_PENALTIES",
        "POSTPONED",
        "SUSPENDED",
        "CANCELLED",
        "ABANDONED",
        "AWARDED",
        "UNKNOWN"
      ],
      member_status: ["active", "removed"],
      prediction_set_status: ["draft", "complete", "locked"],
      prediction_sync_status: ["SAVED", "SYNCING", "SYNCED", "SYNC_FAILED", "LOCAL"],
      prediction_validation_status: ["valid", "invalid", "incomplete"],
      rule_version_status: ["draft", "locked"]
    }
  }
} as const;
