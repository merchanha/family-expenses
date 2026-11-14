import type { User } from './user';

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  /** Throws EmailAlreadyRegisteredError on a duplicate email (also under a race). */
  abstract create(user: NewUser): Promise<User>;
  abstract updateName(id: string, name: string): Promise<User>;
}
