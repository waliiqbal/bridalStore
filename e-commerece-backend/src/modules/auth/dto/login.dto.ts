import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1, { message: 'Please enter your password' })
  @MaxLength(200)
  password: string;
}
