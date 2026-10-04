import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_MIN = 8;
const passwordMessage = `Your password must be at least ${PASSWORD_MIN} characters`;

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN, { message: passwordMessage })
  @MaxLength(200)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}

export class CustomerLoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1, { message: 'Please enter your password' })
  @MaxLength(200)
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(200)
  token: string;

  @IsString()
  @MinLength(PASSWORD_MIN, { message: passwordMessage })
  @MaxLength(200)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Please enter your current password' })
  @MaxLength(200)
  currentPassword: string;

  @IsString()
  @MinLength(PASSWORD_MIN, { message: passwordMessage })
  @MaxLength(200)
  newPassword: string;
}
