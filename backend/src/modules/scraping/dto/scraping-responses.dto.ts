import { ApiProperty } from "@nestjs/swagger";

// Contact interface for nested data
export class ContactDto {
  @ApiProperty({
    description: "Contact person's full name",
    example: "John Smith",
  })
  name!: string;

  @ApiProperty({
    description: "Contact person's job title",
    example: "Chief Technology Officer",
  })
  title!: string;

  @ApiProperty({
    description: "Contact person's email address",
    example: "john.smith@company.com",
    format: "email",
  })
  email!: string;
}

// Response DTO for job creation
export class CreateScrapingJobResponseDto {
  @ApiProperty({
    description: "Unique identifier for the created scraping job",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  jobId!: string;
}

// Response DTO for scraping job details
export class ScrapingJobDto {
  @ApiProperty({
    description: "Unique job identifier",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "User ID who created the job",
    example: "987e6543-e21b-12d3-a456-426614174000",
    format: "uuid",
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty({
    description: "Current status of the scraping job",
    example: "processing",
    enum: ["pending", "processing", "completed", "failed"],
  })
  status!: string;

  @ApiProperty({
    description: "Total number of URLs to scrape",
    example: 10,
  })
  totalUrls!: number;

  @ApiProperty({
    description:
      "Number of URLs that have been processed (completed or failed)",
    example: 5,
  })
  processedUrls!: number;

  @ApiProperty({
    description: "Number of URLs that failed to scrape",
    example: 1,
  })
  failedUrls!: number;

  @ApiProperty({
    description: "Timestamp when the job was created",
    example: "2023-12-01T10:00:00.000Z",
    format: "date-time",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Timestamp when the job was last updated",
    example: "2023-12-01T10:30:00.000Z",
    format: "date-time",
  })
  updatedAt!: Date;
}

// Response DTO for scraping item details
export class ScrapingItemDto {
  @ApiProperty({
    description: "Unique item identifier",
    example: "456e7890-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  id!: string;

  @ApiProperty({
    description: "Parent job identifier",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  jobId!: string;

  @ApiProperty({
    description: "URL being scraped",
    example: "https://example.com/company",
  })
  url!: string;

  @ApiProperty({
    description: "Current status of the scraping item",
    example: "completed",
    enum: ["pending", "queued", "processing", "completed", "failed"],
  })
  status!: string;

  @ApiProperty({
    description: "Error message if the scraping failed",
    example: "HTTP 404",
    nullable: true,
  })
  lastError!: string | null;

  @ApiProperty({
    description: "Timestamp when processing started",
    example: "2023-12-01T10:05:00.000Z",
    format: "date-time",
    nullable: true,
  })
  startedAt!: Date | null;

  @ApiProperty({
    description: "Timestamp when processing finished",
    example: "2023-12-01T10:06:00.000Z",
    format: "date-time",
    nullable: true,
  })
  finishedAt!: Date | null;

  @ApiProperty({
    description: "Extracted company name",
    example: "Acme Corporation",
    nullable: true,
  })
  companyName!: string | null;

  @ApiProperty({
    description: "Extracted company website URL",
    example: "https://www.acme.com",
    nullable: true,
  })
  website!: string | null;

  @ApiProperty({
    description: "Extracted company industry",
    example: "Technology",
    nullable: true,
  })
  industry!: string | null;

  @ApiProperty({
    description: "Extracted company headcount range",
    example: "100-500",
    nullable: true,
  })
  headcountRange!: string | null;

  @ApiProperty({
    description: "Extracted company headquarters location",
    example: "San Francisco, CA",
    nullable: true,
  })
  hqLocation!: string | null;

  @ApiProperty({
    description: "Array of extracted contact information",
    type: [ContactDto],
    nullable: true,
  })
  contacts!: ContactDto[] | null;

  @ApiProperty({
    description: "Raw metadata from the scraping process",
    example: { url: "https://example.com", htmlLength: 5000 },
    nullable: true,
  })
  rawData!: Record<string, any> | null;

  @ApiProperty({
    description: "Timestamp when the item was created",
    example: "2023-12-01T10:00:00.000Z",
    format: "date-time",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Timestamp when the item was last updated",
    example: "2023-12-01T10:06:00.000Z",
    format: "date-time",
  })
  updatedAt!: Date;
}

// Response DTO for job details with items
export class JobWithItemsDto {
  @ApiProperty({
    description: "Scraping job details",
    type: ScrapingJobDto,
  })
  job!: ScrapingJobDto;

  @ApiProperty({
    description: "Array of scraping items associated with the job",
    type: [ScrapingItemDto],
  })
  items!: ScrapingItemDto[];
}

// Response DTO for list of jobs
export class ListScrapingJobsResponseDto {
  @ApiProperty({
    description: "Array of scraping jobs",
    type: [ScrapingJobDto],
  })
  jobs!: ScrapingJobDto[];
}

// Response DTO for list of items
export class ListScrapingItemsResponseDto {
  @ApiProperty({
    description: "Array of scraping items",
    type: [ScrapingItemDto],
  })
  items!: ScrapingItemDto[];
}
