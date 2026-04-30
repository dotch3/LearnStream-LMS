import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: Role }) role: Role;
}

export class LoginResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: UserDto }) user: UserDto;
}
