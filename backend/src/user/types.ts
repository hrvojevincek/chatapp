import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field({ nullable: true })
  id?: number;

  @Field()
  fullName: string;

  @Field()
  email?: string;

  @Field()
  password?: string;

  @Field()
  createdAt?: Date;

  @Field()
  updatedAt?: Date;

  @Field()
  avatarUrl?: string;
}
