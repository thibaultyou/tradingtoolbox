import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';

import { AccountValidationGuard } from '@account/guards/account-validation.guard';
import { BaseController } from '@common/base.controller';
import { UuidValidationPipe } from '@common/pipes/uuid-validation.pipe';
import { ExtractUserId } from '@user/decorators/user-id-extractor.decorator';
import { JwtAuthGuard } from '@user/guards/jwt-auth.guard';

import { StrategyCreateRequestDto } from './dtos/strategy-create.request.dto';
import { StrategyReadResponseDto } from './dtos/strategy-read.response.dto';
import { StrategyUpdateRequestDto } from './dtos/strategy-update.request.dto';
import { StrategyService } from './strategy.service';

@ApiTags('Strategies')
@UseGuards(JwtAuthGuard, AccountValidationGuard)
@ApiBearerAuth()
@Controller('strategies')
export class StrategyController extends BaseController {
  constructor(private readonly strategyService: StrategyService) {
    super('Strategies');
  }

  @Get()
  @ApiOperation({ summary: 'Fetch all strategies' })
  @ApiResponse({ status: 200, description: 'List of strategies', type: [StrategyReadResponseDto] })
  async getAllStrategies(@ExtractUserId() userId: string): Promise<StrategyReadResponseDto[]> {
    const strategies = await this.strategyService.getAllStrategies(userId);
    return strategies.map((strategy) => new StrategyReadResponseDto(strategy));
  }

  @Get(':strategyId')
  @ApiOperation({ summary: 'Fetch a single strategy' })
  @ApiParam({ name: 'strategyId', required: true, description: 'The ID of the strategy (UUID format)' })
  @ApiResponse({ status: 200, description: 'The strategy', type: StrategyReadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async getStrategyById(
    @ExtractUserId() userId: string,
    @Param('strategyId', UuidValidationPipe) strategyId: string
  ): Promise<StrategyReadResponseDto> {
    const strategy = await this.strategyService.getStrategyById(userId, strategyId);
    return new StrategyReadResponseDto(strategy);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new strategy' })
  @ApiBody({ description: 'Strategy creation details', type: StrategyCreateRequestDto })
  @ApiResponse({ status: 201, description: 'The created strategy', type: StrategyReadResponseDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createStrategy(
    @ExtractUserId() userId: string,
    @Body() strategyCreateRequestDto: StrategyCreateRequestDto
  ): Promise<StrategyReadResponseDto> {
    const createdStrategy = await this.strategyService.createStrategy(userId, strategyCreateRequestDto);
    return new StrategyReadResponseDto(createdStrategy);
  }

  @Patch(':strategyId')
  @ApiOperation({ summary: 'Update a strategy' })
  @ApiParam({ name: 'strategyId', required: true, description: 'The ID of the strategy (UUID format)' })
  @ApiBody({ description: 'Strategy update details', type: StrategyUpdateRequestDto })
  @ApiResponse({ status: 200, description: 'The updated strategy', type: StrategyReadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async updateStrategy(
    @ExtractUserId() userId: string,
    @Param('strategyId', UuidValidationPipe) strategyId: string,
    @Body() strategyUpdateRequestDto: StrategyUpdateRequestDto
  ): Promise<StrategyReadResponseDto> {
    const updatedStrategy = await this.strategyService.updateStrategy(userId, strategyId, strategyUpdateRequestDto);
    return new StrategyReadResponseDto(updatedStrategy);
  }

  @Delete(':strategyId')
  @ApiOperation({ summary: 'Delete a strategy' })
  @ApiParam({ name: 'strategyId', required: true, description: 'The ID of the strategy (UUID format)' })
  @ApiResponse({ status: 204, description: 'Strategy successfully deleted' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async deleteStrategy(
    @ExtractUserId() userId: string,
    @Param('strategyId', UuidValidationPipe) strategyId: string
  ): Promise<void> {
    await this.strategyService.deleteStrategy(userId, strategyId);
  }
}
