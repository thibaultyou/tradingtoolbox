import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventHandlersContext, Events } from '@config';

import { ExchangeTerminatedEvent } from '../events/exchange-terminated.event';
import { WebsocketManagerService } from '../services/websocket-manager.service';

@Injectable()
export class ExchangeModuleExchangeTerminatedEventHandler {
  private logger = new Logger(EventHandlersContext.ExchangeModule);

  constructor(private websocketManagerService: WebsocketManagerService) {}

  @OnEvent(Events.Exchange.TERMINATED)
  handle(event: ExchangeTerminatedEvent) {
    const actionContext = `${Events.Exchange.TERMINATED} | AccountID: ${event.accountId}`;

    try {
      this.websocketManagerService.stopTrackingAccount(event.accountId);
      this.logger.log(actionContext);
    } catch (error) {
      this.logger.error(
        `${actionContext} - Failed to remove account from websocket manager - Error: ${error.message}`,
        error.stack
      );
    }
  }
}
