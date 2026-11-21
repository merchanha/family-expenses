import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';

/**
 * Validates a body/query/param against a Zod schema from @tandem/shared.
 * Usage: @Body(new ZodValidationPipe(createTransactionSchema)) dto: CreateTransactionInput
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  // Input is `unknown`: schemas may transform (query strings → numbers/booleans).
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}
