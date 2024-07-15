import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventHandlersContext } from '@config/event-handlers.config';
import { Events } from '@config/events.config';
import { ExchangeInitializedEvent } from '@exchange/events/exchange-initialized.event';

import { MarketService } from '../market.service';

@Injectable()
export class MarketModuleExchangeInitializedEventHandler {
  private logger = new Logger(EventHandlersContext.MarketModuleEventHandler);

  constructor(private marketService: MarketService) {}

  @OnEvent(Events.EXCHANGE_INITIALIZED)
  async handle(event: ExchangeInitializedEvent) {
    const actionContext = `${Events.EXCHANGE_INITIALIZED} | AccountID: ${event.accountId}`;

    try {
      await this.marketService.startTrackingAccount(event.accountId);
      this.logger.log(actionContext);
    } catch (error) {
      this.logger.error(
        `${actionContext} - Failed to add account to market watch list - Error: ${error.message}`,
        error.stack
      );
    }
  }
}
