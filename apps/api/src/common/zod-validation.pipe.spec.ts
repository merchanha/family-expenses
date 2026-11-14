import { BadRequestException } from '@nestjs/common';
import { positiveMoneyStringSchema, z } from '@tandem/shared';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ amount: positiveMoneyStringSchema }));
  it('passes valid input', () => expect(pipe.transform({ amount: '10.50' })).toEqual({ amount: '10.50' }));
  it('rejects float numbers and zero', () => {
    expect(() => pipe.transform({ amount: 10.5 })).toThrow(BadRequestException);
    expect(() => pipe.transform({ amount: '0' })).toThrow(BadRequestException);
  });
});
