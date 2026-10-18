/**
 * Database types for the Supabase client.
 *
 * Written to match supabase/migrations. After linking a Supabase project you
 * can regenerate this file with `npm run db:types`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<TCol extends string, TRef extends string> = {
  foreignKeyName: string;
  columns: [TCol];
  isOneToOne: boolean;
  referencedRelation: TRef;
  referencedColumns: ["id"];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          base_currency: string;
          locale: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          base_currency?: string;
          locale?: string;
        };
        Update: {
          display_name?: string | null;
          base_currency?: string;
          locale?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          asset_class: Database["public"]["Enums"]["asset_class"];
          market: Database["public"]["Enums"]["market"];
          currency: string;
          exchange: string | null;
          isin: string | null;
          provider_ref: string | null;
          keywords: string[];
          is_active: boolean;
          refresh_attempted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          asset_class: Database["public"]["Enums"]["asset_class"];
          market: Database["public"]["Enums"]["market"];
          currency: string;
          exchange?: string | null;
          isin?: string | null;
          provider_ref?: string | null;
          keywords?: string[];
          is_active?: boolean;
          refresh_attempted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [];
      };
      asset_imports: {
        Row: { id: number; user_id: string; asset_id: string; created_at: string };
        Insert: { user_id: string; asset_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [Rel<"asset_id", "assets">];
      };
      asset_quotes: {
        Row: {
          asset_id: string;
          price: number;
          previous_close: number | null;
          as_of: string;
          source: string;
          updated_at: string;
        };
        Insert: {
          asset_id: string;
          price: number;
          previous_close?: number | null;
          as_of: string;
          source: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["asset_quotes"]["Insert"]>;
        Relationships: [Rel<"asset_id", "assets">];
      };
      asset_prices: {
        Row: { asset_id: string; price_date: string; close: number };
        Insert: { asset_id: string; price_date: string; close: number };
        Update: Partial<Database["public"]["Tables"]["asset_prices"]["Insert"]>;
        Relationships: [Rel<"asset_id", "assets">];
      };
      fx_rates: {
        Row: { quote: string; rate: number; as_of: string };
        Insert: { quote: string; rate: number; as_of: string };
        Update: Partial<Database["public"]["Tables"]["fx_rates"]["Insert"]>;
        Relationships: [];
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; user_id?: string; name: string; is_default?: boolean };
        Update: { name?: string; is_default?: boolean };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          portfolio_id: string;
          user_id: string;
          asset_id: string;
          type: Database["public"]["Enums"]["transaction_type"];
          quantity: number;
          price: number;
          fees: number;
          amount: number;
          currency: string;
          executed_at: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          user_id?: string;
          asset_id: string;
          type: Database["public"]["Enums"]["transaction_type"];
          quantity?: number;
          price?: number;
          fees?: number;
          amount?: number;
          currency: string;
          executed_at: string;
          note?: string | null;
        };
        Update: Omit<Partial<Database["public"]["Tables"]["transactions"]["Insert"]>, "user_id" | "id">;
        Relationships: [Rel<"asset_id", "assets">, Rel<"portfolio_id", "portfolios">];
      };
      watchlist_items: {
        Row: { user_id: string; asset_id: string; created_at: string };
        Insert: { user_id?: string; asset_id: string };
        Update: Record<string, never>;
        Relationships: [Rel<"asset_id", "assets">];
      };
      news_items: {
        Row: {
          id: string;
          title: string;
          url: string;
          source: string;
          language: string;
          published_at: string;
          content_excerpt: string | null;
          summary_en: string | null;
          summary_fr: string | null;
          summary_status: Database["public"]["Enums"]["summary_status"];
          summarized_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          url: string;
          source: string;
          language?: string;
          published_at: string;
          content_excerpt?: string | null;
          summary_en?: string | null;
          summary_fr?: string | null;
          summary_status?: Database["public"]["Enums"]["summary_status"];
          summarized_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["news_items"]["Insert"]>;
        Relationships: [];
      };
      news_item_assets: {
        Row: { news_id: string; asset_id: string };
        Insert: { news_id: string; asset_id: string };
        Update: Record<string, never>;
        Relationships: [Rel<"news_id", "news_items">, Rel<"asset_id", "assets">];
      };
      corporate_events: {
        Row: {
          id: string;
          asset_id: string;
          type: Database["public"]["Enums"]["event_type"];
          title: string;
          event_date: string;
          ex_date: string | null;
          payment_date: string | null;
          amount: number | null;
          currency: string | null;
          source_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          type: Database["public"]["Enums"]["event_type"];
          title: string;
          event_date: string;
          ex_date?: string | null;
          payment_date?: string | null;
          amount?: number | null;
          currency?: string | null;
          source_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["corporate_events"]["Insert"]>;
        Relationships: [Rel<"asset_id", "assets">];
      };
      alert_rules: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          type: Database["public"]["Enums"]["alert_type"];
          threshold: number;
          is_active: boolean;
          last_triggered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          asset_id: string;
          type: Database["public"]["Enums"]["alert_type"];
          threshold: number;
          is_active?: boolean;
          last_triggered_at?: string | null;
        };
        Update: { type?: Database["public"]["Enums"]["alert_type"]; threshold?: number; is_active?: boolean; last_triggered_at?: string | null };
        Relationships: [Rel<"asset_id", "assets">];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: "alert" | "event" | "news" | "system";
          title: string;
          body: string | null;
          asset_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: "alert" | "event" | "news" | "system";
          title: string;
          body?: string | null;
          asset_id?: string | null;
          read_at?: string | null;
        };
        Update: { read_at?: string | null };
        Relationships: [Rel<"asset_id", "assets">];
      };
      job_runs: {
        Row: {
          id: number;
          job: string;
          started_at: string;
          finished_at: string | null;
          ok: boolean | null;
          detail: Json | null;
        };
        Insert: { job: string; started_at?: string; finished_at?: string | null; ok?: boolean | null; detail?: Json | null };
        Update: { finished_at?: string | null; ok?: boolean | null; detail?: Json | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      set_default_portfolio: { Args: { target: string }; Returns: undefined };
    };
    Enums: {
      app_role: "user" | "admin";
      asset_class: "stock" | "etf" | "index" | "crypto" | "commodity";
      market: "casablanca" | "us" | "europe" | "crypto" | "commodities";
      transaction_type: "buy" | "sell" | "dividend" | "fee";
      event_type: "dividend" | "agm" | "earnings" | "split" | "other";
      alert_type: "price_above" | "price_below" | "daily_move";
      summary_status: "pending" | "done" | "rejected" | "skipped";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
