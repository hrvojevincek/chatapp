import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    let payload;

    try {
      payload = await this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userExists = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });
    if (!userExists) {
      throw new UnauthorizedException('User no longer exist');
    }

    const expiresIn = 15000;
    const expiration = Math.floor(Date.now() / 1000) + expiresIn;
    const accessToken = await this.jwtService.sign(
      {
        ...payload,
        exp: expiration,
      },
      {
        secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
      },
    );

    res.cookie('access_token', accessToken, {
      httpOnly: true,
    });

    return accessToken;
  }

  private async issueTokens(user: User, response: Response) {
    const payload = { username: user.fullname, sub: user.id };

    const accessToken = this.jwtService.sign(
      { ...payload },
      {
        secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
        expiresIn: '150sec',
      },
    );

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: '7d',
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
    });

    response.cookie('access_token', accessToken, {
      httpOnly: true,
    });

    return { user };
  }

  async validateUser(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });
    if (user && (await bcrypt.compare(loginDto.password, user.password))) {
      return user;
    }
    return null;
  }

  async register(RegisterDto: RegisterDto, response: Response) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: RegisterDto.email,
      },
    });

    if (existingUser) {
      throw new BadRequestException({
        message: 'Email already in use',
      });
    }
    const hashedPassword = await bcrypt.hash(RegisterDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullname: RegisterDto.fullname,
        email: RegisterDto.email,
        password: hashedPassword,
      },
    });

    return this.issueTokens(user, response);
  }

  async login(loginDto: LoginDto, response: Response) {
    const user = await this.validateUser(loginDto);
    if (!user) {
      throw new BadRequestException({
        invalidCredentials: 'Invalid credentials',
      });
    }
    return this.issueTokens(user, response);
  }

  async logout(response: Response) {
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return 'Successfully logged out';
  }
}
