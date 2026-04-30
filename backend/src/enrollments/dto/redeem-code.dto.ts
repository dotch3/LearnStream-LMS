import { IsString, MinLength } from 'class-validator';

export class RedeemCodeDto {
  @IsString()
  @MinLength(1)
  code: string;
}
