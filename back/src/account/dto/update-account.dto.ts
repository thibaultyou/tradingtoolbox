import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

import { ExchangeType } from '../../exchange/exchange.types';

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  secret?: string;

  @ApiProperty({
    enum: ExchangeType,
    example: ExchangeType.Bybit,
    required: false,
  })
  @IsEnum(ExchangeType)
  @IsOptional()
  exchange?: ExchangeType;
}
