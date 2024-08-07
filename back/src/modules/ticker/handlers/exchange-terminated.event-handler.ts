import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventHandlersContext, Events } from '@config';
import { ExchangeTerminatedEvent } from '@exchange/events/exchange-terminated.event';

import { TickerService } from '../ticker.service';

@Injectable()
export class TickerModuleExchangeTerminatedEventHandler {
  private logger = new Logger(EventHandlersContext.TickerModule);

  constructor(private tickerService: TickerService) {}

  @OnEvent(Events.Exchange.TERMINATED)
  handle(event: ExchangeTerminatedEvent) {
    const actionContext = `${Events.Exchange.TERMINATED} | AccountID: ${event.accountId}`;

    try {
      this.tickerService.stopTrackingAccount(event.accountId);
      this.logger.log(actionContext);
    } catch (error) {
      this.logger.error(
        `${actionContext} - Failed to remove account from ticker watch list - Error: ${error.message}`,
        error.stack
      );
    }
  }
}
