import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { RegisterDto, LoginDto } from "@repo/contracts";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register new user account" })
  @ApiResponse({
    status: 201,
    description: "User registered and session cookies issued",
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken
    );
    return { user: result.user };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiResponse({
    status: 200,
    description: "Authenticated and session cookies issued",
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken
    );
    return { user: result.user };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh expired access token using refresh cookie",
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: "Tokens refreshed successfully" };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Clear authentication cookies" })
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: "lax" as const,
    };
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth("accessToken")
  @ApiOperation({ summary: "Get current authenticated user profile" })
  async getMe(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
  ) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
