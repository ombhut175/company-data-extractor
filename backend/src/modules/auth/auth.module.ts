import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SupabaseModule } from "../../core/supabase/supabase.module";
import { DatabaseModule } from "../../core/database/database.module";

@Module({
  imports: [SupabaseModule, DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
