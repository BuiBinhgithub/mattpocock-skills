import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaService } from "./database/prisma.service";
import { USER_REPOSITORY } from "./modules/users/repositories/user.repository.interface";
import { PrismaUserRepository } from "./modules/users/repositories/prisma-user.repository";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [AppController],
  providers: [
    PrismaService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [PrismaService, USER_REPOSITORY],
})
export class AppModule {}
