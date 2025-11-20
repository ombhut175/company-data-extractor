import { IsBoolean, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateScrapingJobDto {
  @ApiProperty({
    description:
      "Flag to use mock server for testing. When true, the system will scrape data from the mock server URL instead of requiring a file upload",
    example: false,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: "useMockServer must be a boolean value" })
  useMockServer?: boolean;
}
