import { Injectable } from '@nestjs/common';
import { profileOf, UserProfile, UserRepository } from '../domain/user';

/** Profile of a user by id (e.g. after a token refresh); null if the user no longer exists. */
@Injectable()
export class GetUserProfile {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<UserProfile | null> {
    const user = await this.users.findById(userId);
    return user ? profileOf(user) : null;
  }
}
