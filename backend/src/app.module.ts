import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    AuthModule,
    UserModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [ConfigModule, AppModule],
      inject: [ConfigService],
      driver: ApolloDriver,
      //TODO !! DONT FORGET TO PUT CONFIG SERVICE IN THE USEFACTORY !!
      useFactory: async () => {
        return {
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          playground: true,
          sortSchema: true,
          csrfPrevention: true, // Disable CSRF protection
        };
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
