import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Events } from '../../../config';
import { ExchangeTerminatedEvent } from '../../exchange/events/exchange-terminated.event';
import { OrderService } from '../order.service';

@Injectable()
export class OrderModuleExchangeTerminatedEventHandler {
  private logger = new Logger(OrderModuleExchangeTerminatedEventHandler.name);

  constructor(private orderService: OrderService) {}

  @OnEvent(Events.EXCHANGE_TERMINATED)
  handle(event: ExchangeTerminatedEvent) {
    const actionContext = `Event: EXCHANGE_TERMINATED - AccountID: ${event.accountId}`;

    try {
      this.orderService.stopTrackingAccount(event.accountId);
      this.logger.log(actionContext);
    } catch (error) {
      this.logger.error(
        `${actionContext} - Failed to remove account from order watch list - Error: ${error.message}`,
        error.stack
      );
    }
  }
}