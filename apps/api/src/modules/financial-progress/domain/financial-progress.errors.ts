import { ApiErrorCode } from '@tandem/shared';
import { BusinessRuleError } from '../../../common/domain-error';

export class FuturePeriodError extends BusinessRuleError {
  constructor() {
    super('Financial Progress cannot compare a month that has not started yet', ApiErrorCode.FUTURE_PERIOD);
  }
}
