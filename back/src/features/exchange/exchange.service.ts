import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Balances, Market, Order, Position } from 'ccxt';

import { Events } from '../../config';
import { Account } from '../account/entities/account.entity';
import { OrderSide } from '../order/order.types';
import { ExchangeInitializedEvent } from './events/exchange-initialized.event';
import { ExchangeTerminatedEvent } from './events/exchange-terminated.event';
import { ExchangeNotFoundException, ExchangeOperationFailedException } from './exceptions/exchange.exceptions';
import { IExchangeService } from './exchange.interfaces';
import { ExchangeFactory } from './services/exchange-service.factory';

// TODO move bybit related content out of here
// TODO improve logging, error handling, custom exceptions

@Injectable()
export class ExchangeService {
  private logger: Logger = new Logger(ExchangeService.name);
  private exchanges: Map<string, IExchangeService> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private exchangeFactory: ExchangeFactory
  ) {}

  async initializeExchange(account: Account): Promise<void> {
    this.logger.log(`Initialization Initiated - AccountID: ${account.id}`);

    if (!account) {
      this.logger.error(`Initialization Skipped - AccountID: ${account.id}, Reason: Missing account`);

      return;
    }

    if (this.exchanges.has(account.id)) {
      this.logger.error(`Initialization Skipped - AccountID: ${account.id}, Reason: Already initialized`);

      return;
    }

    try {
      const exchange = await this.exchangeFactory.createExchange(account);

      this.exchanges.set(account.id, exchange);
      this.logger.log(`Initialized Successfully - AccountID: ${account.id}`);
      this.eventEmitter.emit(Events.EXCHANGE_INITIALIZED, new ExchangeInitializedEvent(account.id));
    } catch (error) {
      this.logger.error(`Initialization Failed - AccountID: ${account.id}, Error: ${error.message}`, error.stack);
    }
  }

  async cleanResources(accountId: string): Promise<void> {
    this.logger.log(`Cleanup Initiated - AccountID: ${accountId}`);

    const exchange = this.getExchange(accountId);

    if (!exchange) {
      this.logger.warn(`Cleanup Skipped - AccountID: ${accountId}, Reason: No associated exchange`);

      return;
    }

    try {
      this.logger.log(`Cleanup Started - AccountID: ${accountId}`);
      await exchange.clean();
      this.exchanges.delete(accountId);
      this.eventEmitter.emit(Events.EXCHANGE_TERMINATED, new ExchangeTerminatedEvent(accountId));
      this.logger.log(`Cleanup Completed - AccountID: ${accountId}`);
    } catch (error) {
      this.logger.error(`Cleanup Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('cleanResources', error);
    }
  }

  private getExchange(accountId: string): IExchangeService {
    this.logger.log(`Exchange Fetch Initiated - AccountID: ${accountId}`);
    const exchange = this.exchanges.get(accountId);

    if (!exchange) {
      this.logger.error(`Not Found - AccountID: ${accountId}, Reason: Exchange service for account not initialized`);
      throw new ExchangeNotFoundException(accountId);
    }

    return exchange;
  }

  async getBalances(accountId: string): Promise<Balances> {
    this.logger.log(`Balances Fetch Initiated - AccountID: ${accountId}`);
    const exchange = this.getExchange(accountId);

    try {
      const balances = await exchange.getBalances();

      this.logger.log(`Balances Fetched - AccountID: ${accountId}, Balances: ${JSON.stringify(balances)}`);

      return balances;
    } catch (error) {
      this.logger.error(`Balances Fetch Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('getBalances', error);
    }
  }

  async getMarkets(accountId: string): Promise<Market[]> {
    this.logger.log(`Markets Fetch Initiated - AccountID: ${accountId}`);

    const exchange = this.getExchange(accountId);

    try {
      const markets = await exchange.getMarkets();

      this.logger.log(`Markets Fetched - AccountID: '${accountId}', Count: ${markets.length}`);

      return markets;
    } catch (error) {
      this.logger.error(`Markets Fetch Failed - AccountID: '${accountId}', Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('getMarkets', error);
    }
  }

  async getOpenOrders(accountId: string): Promise<Order[]> {
    this.logger.log(`Open Orders Fetch Initiated - AccountID: ${accountId}`);
    const exchange = this.getExchange(accountId);

    try {
      const orders = await exchange.getOpenOrders();

      this.logger.log(`Open Orders Fetched - AccountID: ${accountId}, Count: ${orders.length}`);

      return orders;
    } catch (error) {
      this.logger.error(`Open Orders Fetch Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('fetchOpenOrders', error);
    }
  }

  async getOrders(accountId: string, symbol?: string): Promise<Order[]> {
    this.logger.log(`Orders Fetch Initiated - AccountID: ${accountId}`);
    const exchange = this.getExchange(accountId);

    try {
      const orders = await exchange.getOrders(symbol);

      this.logger.log(`Orders Fetched - AccountID: ${accountId}, Count: ${orders.length}`);

      return orders;
    } catch (error) {
      this.logger.error(`Orders Fetch Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('fetchOrders', error);
    }
  }

  async getOrder(accountId: string, symbol: string, orderId: string): Promise<Order> {
    this.logger.log(`Order Fetch Initiated - AccountID: ${accountId}`);
    const exchange = this.getExchange(accountId);

    try {
      const order = await exchange.getOrder(orderId, symbol);

      this.logger.log(`Order Fetched - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}`);

      return order;
    } catch (error) {
      this.logger.error(
        `Order Fetch Failed - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}, Error: ${error.message}`,
        error.stack
      );
      throw new ExchangeOperationFailedException('fetchOrder', error);
    }
  }

  async getOpenPositions(accountId: string): Promise<Position[]> {
    this.logger.log(`Open Positions Fetch Initiated - AccountID: ${accountId}`);
    const exchange = this.getExchange(accountId);

    try {
      const positions = await exchange.getOpenPositions();

      this.logger.log(`Open Positions Fetched - AccountID: ${accountId}, Count: ${positions.length}`);

      return positions;
    } catch (error) {
      this.logger.error(`Open Positions Fetch Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('getOpenPositions', error);
    }
  }

  async openOrder(
    accountId: string,
    symbol: string,
    side: OrderSide,
    volume: number,
    price?: number,
    stopLossPrice?: number,
    takeProfitPrice?: number,
    params?: Record<string, any>
  ): Promise<Order> {
    this.logger.log(`Open Order Initiated - AccountID: ${accountId}`);
    const exchange = this.getExchange(accountId);

    try {
      // TODO ensure that symbol is in hedge mode before opening the order
      const order = await exchange.openOrder(symbol, side, volume, price, stopLossPrice, takeProfitPrice, params);

      this.logger.log(`Order Opened - AccountID: ${accountId}, Order: ${JSON.stringify(order)}`);

      return order;
    } catch (error) {
      this.logger.error(`Open Order Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('openOrder', error);
    }
  }

  async closePosition(accountId: string, symbol: string, side: OrderSide, volume: number): Promise<Order> {
    this.logger.log(`Position Close Initiated - AccountID: ${accountId}, Symbol: ${symbol}, Side: ${side}`);

    try {
      const order = await this.openOrder(
        accountId,
        symbol,
        side === OrderSide.Buy ? OrderSide.Sell : OrderSide.Buy,
        volume,
        undefined,
        undefined,
        undefined,
        { positionIdx: side === OrderSide.Buy ? 1 : 2 } // NOTE needed for bybit hedge mode
      );

      this.logger.log(`Position Closed - AccountID: ${accountId}, Symbol: ${symbol}, Side: ${side}`);

      // FIXME improve
      return order[0];
    } catch (error) {
      this.logger.error(
        `Position Close Failed - AccountID: ${accountId}, Symbol: ${symbol}, Side: ${side}, Error: ${error.message}`,
        error.stack
      );
      throw new ExchangeOperationFailedException('closePosition', error);
    }
  }

  async cancelOrder(accountId: string, orderId: string, symbol: string): Promise<Order> {
    this.logger.log(`Order Close Initiated - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}`);
    const exchange = this.getExchange(accountId);

    try {
      const order = await exchange.cancelOrder(orderId, symbol);

      if (!order) {
        this.logger.error(
          `Order Cancellation Failed - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}`
        );
      } else {
        this.logger.log(`Order Cancelled - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}`);
      }

      return order;
    } catch (error) {
      this.logger.error(`Order Cancellation Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('cancelOrder', error);
    }
  }

  // TODO add filter options via params ?
  async cancelOrders(accountId: string, symbol: string): Promise<Order[]> {
    this.logger.log(`Orders Close Initiated - AccountID: ${accountId}, Symbol: ${symbol}`);
    const exchange = this.getExchange(accountId);

    try {
      const orders = await exchange.cancelOrders(symbol);

      if (orders.length === 0) {
        this.logger.error(`Orders Cancellation Failed - AccountID: ${accountId}, Symbol: ${symbol}`);
      } else {
        this.logger.log(`Orders Cancelled - AccountID: ${accountId}, Symbol: ${symbol}`);
      }

      return orders;
    } catch (error) {
      this.logger.error(`Orders Cancellation Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw new ExchangeOperationFailedException('cancelOrders', error);
    }
  }

  // async updateStopLoss(
  //   accountId: string,
  //   orderId: string,
  //   symbol: string,
  //   amount: number,
  //   stopLossPrice: number
  // ): Promise<Order> {
  //   this.logger.log(
  //     `Stop Loss Update Initiated - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}, Amount: ${amount}, Stop Loss Price: ${stopLossPrice}`
  //   );
  //   const exchange = this.getExchange(accountId);

  //   try {
  //     const order = await exchange.updateStopLoss(orderId, symbol, amount, stopLossPrice);
  //     this.logger.log(`Stop Loss Updated - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}, Amount: ${amount}, Stop Loss Price: ${stopLossPrice}`);
  //     return order;
  //   } catch (error) {
  //     this.logger.error(`Stop Loss Update Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
  //     throw new ExchangeOperationFailedException('updateStopLoss', error);
  //   }
  // }

  // async updateTakeProfit(
  //   accountId: string,
  //   orderId: string,
  //   symbol: string,
  //   amount: number,
  //   takeProfitPrice: number
  // ): Promise<Order> {
  //   this.logger.log(
  //     `Take Profit Update Initiated - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}, Amount: ${amount}, Take Profit Price: ${takeProfitPrice}`
  //   );
  //   const exchange = this.getExchange(accountId);

  //   try {
  //     const order = await exchange.updateTakeProfit(orderId, symbol, amount, takeProfitPrice);
  //     this.logger.log(
  //       `Take Profit Updated - AccountID: ${accountId}, OrderID: ${orderId}, Symbol: ${symbol}, Amount: ${amount}, Take Profit Price: ${takeProfitPrice}`
  //     );
  //     return order;
  //   } catch (error) {
  //     this.logger.error(`Take Profit Update Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
  //     throw new ExchangeOperationFailedException('updateTakeProfit', error);
  //   }
  // }

  //   async closeOrdersWithSymbol(accountId: string, symbol: string): Promise<boolean> {
  //     this.logger.log(`Close Orders With Symbol Initiated - AccountID: ${accountId}, Symbol: ${symbol}`);
  //     const exchange = this.getExchange(accountId);

  //     try {
  //       const result = await exchange.closeOrdersWithSymbol(symbol);
  //       if (!result) {
  //         this.logger.error(`Order Close Failed - AccountID: ${accountId}, Symbol: ${symbol}`);
  //       } else {
  //         this.logger.log(`Order Closed - AccountID: ${accountId}, Symbol: ${symbol}`);
  //       }
  //       return result;
  //     } catch (error) {
  //       this.logger.error(
  //         `Orders Close With Symbol Failed - AccountID: ${accountId}, Symbol: ${symbol}, Error: ${error.message}`,
  //         error.stack
  //       );
  //       throw new ExchangeOperationFailedException('closeOrdersWithSymbol', error);
  //     }
  //   }

  // async openLimitLongOrder(accountId: string, symbol: string, volume: number, price: number): Promise<Order> {
  //   this.logger.log(
  //     `Limit Long Order Open Initiated - AccountID: ${accountId}, Symbol: ${symbol}, Volume: ${volume}, Price: ${price}`
  //   );
  //   const exchange = this.getExchange(accountId);

  //   try {
  //     // TODO add logs
  //     return await exchange.openLimitLongOrder(symbol, volume, price);
  //   } catch (error) {
  //     this.logger.error(`Limit Long Order Open Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
  //     throw new ExchangeOperationFailedException('openLimitLongOrder', error);
  //   }
  // }

  // async openLimitShortOrder(accountId: string, symbol: string, volume: number, price: number): Promise<Order> {
  //   this.logger.log(
  //     `Limit Short Order Open Initiated - AccountID: ${accountId}, Symbol: ${symbol}, Volume: ${volume}, Price: ${price}`
  //   );
  //   const exchange = this.getExchange(accountId);

  //   try {
  //     // TODO add logs
  //     return await exchange.openLimitShortOrder(symbol, volume, price);
  //   } catch (error) {
  //     this.logger.error(
  //       `Limit Short Order Open Failed - AccountID: ${accountId}, Error: ${error.message}`,
  //       error.stack
  //     );
  //     throw new ExchangeOperationFailedException('openLimitShortOrder', error);
  //   }
  // }

  // async openMarketLongOrder(accountId: string, symbol: string, volume: number): Promise<Order> {
  //   this.logger.log(`Market Long Order Open Initiated - AccountID: ${accountId}, Symbol: ${symbol}, Volume: ${volume}`);
  //   const exchange = this.getExchange(accountId);

  //   try {
  //     // TODO add logs
  //     return await exchange.openMarketLongOrder(symbol, volume);
  //   } catch (error) {
  //     this.logger.error(
  //       `Market Long Order Open Failed - AccountID: ${accountId}, Error: ${error.message}`,
  //       error.stack
  //     );
  //     throw new ExchangeOperationFailedException('openMarketLongOrder', error);
  //   }
  // }

  // async openMarketShortOrder(accountId: string, symbol: string, volume: number): Promise<Order> {
  //   this.logger.log(
  //     `Market Short Order Open Initiated - AccountID: ${accountId}, Symbol: ${symbol}, Volume: ${volume}`
  //   );
  //   const exchange = this.getExchange(accountId);

  //   try {
  //     // TODO add logs
  //     return await exchange.openMarketShortOrder(symbol, volume);
  //   } catch (error) {
  //     this.logger.error(
  //       `Market Short Order Open Failed - AccountID: ${accountId}, Error: ${error.message}`,
  //       error.stack
  //     );
  //     throw new ExchangeOperationFailedException('openMarketShortOrder', error);
  //   }
  // }
}
