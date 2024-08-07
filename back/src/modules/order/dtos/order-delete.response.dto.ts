import { ApiProperty } from '@nestjs/swagger';
import { Order } from 'ccxt';

export class OrderDeleteResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: '3f309063-cfd1-4ce8-ad74-77c94b01563f'
  })
  id: string;

  @ApiProperty({
    description: 'External order link ID, used for tracking the order on external systems or client side',
    example: '3cms_req_t_697716177_3'
  })
  linkId: string;

  @ApiProperty({
    description: 'Trading symbol for the order',
    example: 'DOGEUSDT'
  })
  marketId: string;

  constructor(order: Order) {
    this.id = order.info.orderId;
    this.linkId = order.info.orderLinkId;
    this.marketId = order.symbol;
  }
}
