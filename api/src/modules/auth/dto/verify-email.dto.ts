import { Transform } from 'class-transformer';
import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^\d{6}$/, {
    message: 'verification code must be exactly six digits',
  })
  code!: string;
}
