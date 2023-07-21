import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Events } from '../../app.constants';
import { TickerUpdateEvent } from '../events/ticker-update.event';
import { TickerService } from '../ticker.service';

@Injectable()
export class TickerUpdateHandler {
  private logger = new Logger(TickerUpdateHandler.name);

  constructor(private tickerService: TickerService) {}

  @OnEvent(Events.TICKER_UPDATE)
  handle(event: TickerUpdateEvent) {
    try {
      const symbol = event.topic.split('.')[1];
      this.tickerService.updateTicker(event.accountName, symbol, event.data);
      this.logger.debug(
        `[${Events.TICKER_UPDATE}] ${symbol} ${JSON.stringify(event.data)}`,
      );
    } catch (error) {
      this.logger.error('Error handling TickerUpdateEvent', error.stack);
    }
  }
}
