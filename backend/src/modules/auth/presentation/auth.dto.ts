import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../users/domain/credentials';
import { EMAIL_MAX_LENGTH } from '../../users/domain/email';

// Lengths here count UTF-16 units (class-validator); the domain value objects count characters and are the final check.
export class SignUpDto {
  @ApiProperty({ example: 'Ana Souza', maxLength: NAME_MAX_LENGTH })
  @IsString()
  @Length(1, NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ example: 'ana@example.com', maxLength: EMAIL_MAX_LENGTH })
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description: 'RN01: at least 8 characters.',
  })
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password: string;
}

export class LogInDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty()
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password: string;
}

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ana Souza' })
  name: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;
}

/** Body of sign-up, login and refresh; the refresh token goes only in the httpOnly cookie. */
export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT for Authorization: Bearer.' })
  accessToken: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType: 'Bearer';

  @ApiProperty({
    description: 'Access token lifetime in seconds.',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
