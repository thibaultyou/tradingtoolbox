import { Module } from '@nestjs/common';

import { WalletModuleExchangeInitializedEventHandler } from './handlers/exchange-initiated.event-handler';
import { WalletModuleExchangeTerminatedEventHandler } from './handlers/exchange-terminated.event-handler';
import { WalletModuleWalletDataUpdatedEventHandler } from './handlers/wallet-data-updated.event-handler';
import { WalletController } from './wallet.controller';
import { WalletGateway } from './wallet.gateway';
import { WalletService } from './wallet.service';

@Module({
  controllers: [WalletController],
  exports: [WalletService],
  providers: [
    WalletService,
    WalletGateway,
    WalletModuleExchangeInitializedEventHandler,
    WalletModuleExchangeTerminatedEventHandler,
    WalletModuleWalletDataUpdatedEventHandler
  ]
})
export class WalletModule {}
