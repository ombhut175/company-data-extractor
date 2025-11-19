import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignupDto {
  @ApiProperty({
    description: "User email address for account registration",
    example: "jane.smith@example.com",
    format: "email",
    maxLength: 255,
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @ApiProperty({
    description:
      "User password for account registration. Must be at least 8 characters long",
    example: "MySecurePassword123!",
    minLength: 8,
    maxLength: 100,
    format: "password",
  })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password!: string;
}
