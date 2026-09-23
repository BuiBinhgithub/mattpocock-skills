import { User } from "@prisma/client";
import { RegisterDto } from "@repo/contracts";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: RegisterDto & { password: string }): Promise<User>;
}
