import { Module } from "@nestjs/common";
import { TestController } from "./test.controller";
import { TestService } from "./test.service";
import { SupabaseModule } from "../../core/supabase/supabase.module";
import { DatabaseModule } from "../../core/database/database.module";

@Module({
  imports: [SupabaseModule, DatabaseModule],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
