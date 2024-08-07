import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventHandlersContext, Events } from '@config';
import { ExchangeTerminatedEvent } from '@exchange/events/exchange-terminated.event';

import { PositionService } from '../position.service';

@Injectable()
export class PositionModuleExchangeTerminatedEventHandler {
  private logger = new Logger(EventHandlersContext.PositionModule);

  constructor(private positionService: PositionService) {}

  @OnEvent(Events.Exchange.TERMINATED)
  handle(event: ExchangeTerminatedEvent) {
    const actionContext = `${Events.Exchange.TERMINATED} | AccountID: ${event.accountId}`;

    try {
      this.positionService.stopTrackingAccount(event.accountId);
      this.logger.log(actionContext);
    } catch (error) {
      this.logger.error(
        `${actionContext} - Failed to remove account from position watch list - Error: ${error.message}`,
        error.stack
      );
    }
  }
}
