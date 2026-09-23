import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { RegisterDto } from "@repo/contracts";
import { PrismaService } from "../../../database/prisma.service";
import { IUserRepository } from "./user.repository.interface";

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: RegisterDto & { password: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });
  }
}
