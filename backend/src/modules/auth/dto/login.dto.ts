import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: "User email address for authentication",
    example: "jane.smith@example.com",
    format: "email",
    maxLength: 255,
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @ApiProperty({
    description: "User password for authentication",
    example: "MySecurePassword123!",
    minLength: 8,
    maxLength: 100,
    format: "password",
  })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  password!: string;
}
