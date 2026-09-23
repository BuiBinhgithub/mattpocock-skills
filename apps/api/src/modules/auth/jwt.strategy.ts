import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.accessToken || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "dev_secret_key_super_secure_2026",
    });
  }

  async validate(payload: { sub: string; email: string }) {
    if (!payload?.sub) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return { id: payload.sub, email: payload.email };
  }
}
