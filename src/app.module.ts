import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CliModule } from './cli/cli.module';
import { appConfig, getValidationSchema } from './config';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: getValidationSchema(),
      load: [appConfig],
      isGlobal: true,
      cache: true,
    }),
    SharedModule,
    CliModule,
  ],
})
export class AppModule {}
