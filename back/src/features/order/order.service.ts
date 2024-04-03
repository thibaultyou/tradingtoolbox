import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from 'ccxt';

import { IAccountTracker } from '../../common/interfaces/account-tracker.interface';
import { IDataRefresher } from '../../common/interfaces/data-refresher.interface';
import { Events, Timers } from '../../config';
import { AccountNotFoundException } from '../account/exceptions/account.exceptions';
import { ExchangeService } from '../exchange/exchange.service';
import { OrderCreateRequestDto } from './dto/order-create.request.dto';
import { OrdersUpdatedEvent } from './events/orders-updated.event';
import { OrdersUpdateAggregatedException } from './exceptions/orders.exceptions';
import { OrderSide } from './order.types';

@Injectable()
export class OrderService implements OnModuleInit, IAccountTracker, IDataRefresher<Order[]> {
  private logger = new Logger(OrderService.name);
  private openOrders: Map<string, Order[]> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private exchangeService: ExchangeService
  ) {}

  async onModuleInit() {
    setInterval(() => {
      this.refreshAll();
    }, Timers.ORDERS_CACHE_COOLDOWN);
  }

  async startTrackingAccount(accountId: string): Promise<void> {
    if (!this.openOrders.has(accountId)) {
      this.logger.log(`Tracking Initiated - AccountID: ${accountId}`);
      await this.refreshOne(accountId);
    } else {
      this.logger.warn(`Tracking Skipped - AccountID: ${accountId}, Reason: Already tracked`);
    }
  }

  stopTrackingAccount(accountId: string) {
    if (this.openOrders.delete(accountId)) {
      this.logger.log(`Tracking Stopped - AccountID: ${accountId}`);
    } else {
      this.logger.warn(`Tracking Removal Attempt Failed - AccountID: ${accountId}, Reason: Not tracked`);
    }
  }

  async getAccountOrders(accountId: string, marketId?: string): Promise<Order[]> {
    this.logger.log(`Orders - Fetch Initiated - AccountID: ${accountId}`);

    try {
      return await this.exchangeService.getOrders(accountId, marketId);
    } catch (error) {
      this.logger.error(`Orders - Update Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      // TODO improve
      throw error;
    }
  }

  getAccountOpenOrders(accountId: string, marketId?: string): Order[] {
    this.logger.log(`Open Orders - Fetch Initiated - AccountID: ${accountId}`);

    if (!this.openOrders.has(accountId)) {
      this.logger.error(`Open Orders - Fetch Failed - AccountID: ${accountId}, Reason: Account not found`);

      throw new AccountNotFoundException(accountId);
    }

    let orders = this.openOrders.get(accountId);

    if (marketId) {
      orders = orders.filter((order) => order.info.symbol === marketId);
    }

    return orders;
  }

  async getAccountOrderById(accountId: string, marketId: string, orderId: string): Promise<Order> {
    this.logger.log(`Order - Fetch Initiated - AccountID: ${accountId}, MarketID: ${marketId}, OrderID: ${orderId}`);

    try {
      return await this.exchangeService.getOrder(accountId, marketId, orderId);
    } catch (error) {
      this.logger.error(
        `Order - Fetch Failed - AccountID: ${accountId}, MarketID: ${marketId}, OrderID: ${orderId}, Error: ${error.message}`,
        error.stack
      );
      // TODO improve
      throw error;
    }
  }

  async createOrder(accountId: string, dto: OrderCreateRequestDto): Promise<Order> {
    this.logger.log(`Order - Create Initiated - AccountID: ${accountId}, MarketID: ${dto.marketId}`);

    try {
      const order = await this.exchangeService.openOrder(
        accountId,
        dto.marketId,
        dto.side,
        dto.volume,
        dto.price,
        dto.stopLossPrice,
        dto.takeProfitPrice,
        // NOTE see https://bybit-exchange.github.io/docs/v5/order/create-order#request-parameters for reference
        { tpslMode: 'Partial', positionIdx: dto.side === OrderSide.Buy ? 1 : 2 }
      );

      this.logger.log(`Order - Created - AccountID: ${accountId}, Details: ${JSON.stringify(order)}`);

      return order;
    } catch (error) {
      this.logger.error(`Order - Creation Failed - AccountID: ${accountId}`, error.stack);
      // TODO custom exception
      throw error;
    }
  }

  // TODO replace by an event ?
  async cancelOrder(accountId: string, marketId: string, orderId: string): Promise<Order> {
    this.logger.log(`Order - Cancel Initiated - AccountID: ${accountId}, MarketID: ${marketId}, OrderID: ${orderId}`);

    try {
      const order = await this.exchangeService.cancelOrder(accountId, orderId, marketId);

      this.logger.log(`Order - Cancelled - AccountID: ${accountId}, MarketID: ${marketId}, OrderID: ${orderId}`);

      return order;
    } catch (error) {
      this.logger.error(`Order - Cancellation Failed - AccountID: ${accountId}, OrderID: ${orderId}`, error.stack);
      // TODO custom exception
      throw error;
    }
  }

  // TODO replace by an event ?
  async cancelOrders(accountId: string, marketId: string): Promise<Order[]> {
    this.logger.log(`Orders - Cancel Initiated - AccountID: ${accountId}, MarketID: ${marketId}`);

    try {
      const orders = await this.exchangeService.cancelOrders(accountId, marketId);

      this.logger.log(`Orders - Cancelled - AccountID: ${accountId}, MarketID: ${marketId}, Count: ${orders.length}`);

      return orders;
    } catch (error) {
      this.logger.error(`Orders - Cancellation Failed - AccountID: ${accountId}`, error.stack);
      // TODO custom exception
      throw error;
    }
  }

  async refreshOne(accountId: string): Promise<Order[]> {
    this.logger.log(`Open Orders - Refresh Initiated - AccountID: ${accountId}`);

    try {
      const newOrders = await this.exchangeService.getOpenOrders(accountId);
      const currentOrders = this.openOrders.get(accountId) || [];
      const haveOrdersChanged = this.haveOrdersChanged(currentOrders, newOrders);

      if (haveOrdersChanged) {
        this.openOrders.set(accountId, newOrders);
        this.eventEmitter.emit(Events.ORDERS_UPDATED, new OrdersUpdatedEvent(accountId, newOrders));
        this.logger.log(`Open Orders - Updated - AccountID: ${accountId}, Count: ${newOrders.length}`);
      } else {
        this.logger.debug(`Open Orders - Update Skipped - AccountID: ${accountId}, Reason: Unchanged`);
      }

      return newOrders;
    } catch (error) {
      this.logger.error(`Open Orders - Update Failed - AccountID: ${accountId}, Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refreshAll(): Promise<void> {
    this.logger.log(`All Open Orders - Refresh Initiated`);
    const accountIds = Array.from(this.openOrders.keys());
    const errors: Array<{ accountId: string; error: Error }> = [];

    const ordersPromises = accountIds.map((accountId) =>
      this.refreshOne(accountId).catch((error) => {
        errors.push({ accountId, error });
      })
    );

    await Promise.all(ordersPromises);

    if (errors.length > 0) {
      const aggregatedError = new OrdersUpdateAggregatedException(errors);

      this.logger.error(
        `All Open Orders - Multiple Updates Failed - Errors: ${aggregatedError.message}`,
        aggregatedError.stack
      );
      // NOTE Avoid interrupting the loop by not throwing an exception
    }
  }

  private haveOrdersChanged(currentOrders: Order[], newOrders: Order[]): boolean {
    if (currentOrders.length !== newOrders.length) return true;

    const orderMap = new Map(currentOrders.map((order) => [order.id, order]));

    for (const order of newOrders) {
      const currentOrder = orderMap.get(order.id);

      if (!currentOrder || currentOrder.lastUpdateTimestamp !== order.lastUpdateTimestamp) {
        return true;
      }
    }

    return false;
  }
}
