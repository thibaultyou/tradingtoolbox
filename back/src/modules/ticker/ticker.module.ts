import { Module } from '@nestjs/common';

import { AccountModule } from '@account/account.module';
import { OrderModule } from '@order/order.module';
import { PositionModule } from '@position/position.module';

import { TickerModuleExchangeInitializedEventHandler } from './handlers/exchange-initiated.event-handler';
import { TickerModuleExchangeTerminatedEventHandler } from './handlers/exchange-terminated.event-handler';
import { TickerModuleTickerUpdatedEventHandler } from './handlers/ticker-data-updated.event-handler';
import { TickerController } from './ticker.controller';
import { TickerService } from './ticker.service';

@Module({
  controllers: [TickerController],
  exports: [TickerService],
  imports: [AccountModule, PositionModule, OrderModule],
  providers: [
    TickerService,
    TickerModuleExchangeInitializedEventHandler,
    TickerModuleExchangeTerminatedEventHandler,
    TickerModuleTickerUpdatedEventHandler
  ]
})
export class TickerModule {}
