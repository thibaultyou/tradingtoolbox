import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventHandlersContext, Events } from '../../../config';
import { WalletDataUpdatedEvent } from '../../core/events/wallet-data-updated.event';
import { BalanceService } from '../balance.service';

@Injectable()
export class BalanceModuleWalletDataUpdatedEventHandler {
  private logger = new Logger(EventHandlersContext.BalanceModuleEventHandler);

  constructor(private balanceService: BalanceService) {}

  @OnEvent(Events.WALLET_DATA_UPDATED)
  async handle(event: WalletDataUpdatedEvent) {
    const actionContext = `Event: ${Events.WALLET_DATA_UPDATED} - AccountID: ${event.accountId}`;

    try {
      for (const executionData of event.data) {
        this.balanceService.processWalletData(event.accountId, executionData);
      }
      this.logger.log(actionContext);
    } catch (error) {
      this.logger.error(
        `${actionContext} - Failed to process wallet update data - Error: ${error.message}`,
        error.stack
      );
    }
  }
}