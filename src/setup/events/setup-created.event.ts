import { ApiProperty } from '@nestjs/swagger';

export class SetupCreatedEvent {
    @ApiProperty()
    public readonly setupId: string;

    @ApiProperty()
    public readonly ticker: string;

    constructor(setupId: string, ticker: string) {
        this.setupId = setupId;
        this.ticker = ticker;
    }
}