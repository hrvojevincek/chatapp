import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: [
      'Accept',
      'X-Requested-With',
      'Content-Type',
      'Authorization',
      'apollo-require-preflight',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  app.use(cookieParser());
  app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 5 }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // object error messages with key value pair
      exceptionFactory: (errors) => {
        const formattedErrors = errors.reduce((accumulator, error) => {
          accumulator[error.property] = Object.values(error.constraints).join(
            ', ',
          );
          return accumulator;
        }, {});

        throw new BadRequestException(formattedErrors);
      },
    }),
  );
  await app.listen(3000);
}
bootstrap();
