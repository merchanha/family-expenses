/** Port for slow password hashing (argon2id in production; a fast fake in unit tests). */
export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract verify(hash: string, plain: string): Promise<boolean>;
}
