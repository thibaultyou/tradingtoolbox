import { Module } from '@nestjs/common';

import { BalanceController } from './balance.controller';
import { BalanceGateway } from './balance.gateway';
import { BalanceService } from './balance.service';
import { BalanceExchangeInitializedEventHandler } from './handlers/exchange-initiated.balance.event-handler';

@Module({
  providers: [
    BalanceService,
    BalanceGateway,
    BalanceExchangeInitializedEventHandler,
  ],
  controllers: [BalanceController],
  exports: [BalanceService],
})
export class BalanceModule {}
