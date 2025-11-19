import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../../config/supabase.config";
import { MESSAGES } from "../../common/constants/string-const";

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase!: SupabaseClient;

  onModuleInit() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    try {
      if (!supabaseConfig.url || !supabaseConfig.anonKey) {
        throw new Error("Missing Supabase configuration");
      }

      this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
      this.logger.log("Supabase client initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to initialize Supabase: ${errorMessage}`);
      throw new Error(MESSAGES.SUPABASE_CONNECTION_ERROR);
    }
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error(MESSAGES.SUPABASE_CONNECTION_ERROR);
    }
    return this.supabase;
  }

  // Helper method to get service role client for admin operations
  getServiceRoleClient(): SupabaseClient {
    if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
      throw new Error("Missing Supabase service role configuration");
    }
    return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);
  }
}
