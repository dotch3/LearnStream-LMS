import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const refreshToken = req.body?.refreshToken as string | undefined;
    if (!refreshToken) throw new UnauthorizedException();
    return this.authService.refresh(refreshToken);
  }
}
