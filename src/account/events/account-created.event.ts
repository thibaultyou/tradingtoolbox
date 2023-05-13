import { ApiProperty } from '@nestjs/swagger';

export class AccountCreatedEvent {
    @ApiProperty()
    public readonly accountId: string;

    @ApiProperty()
    public readonly name: string;

    constructor(accountId: string, name: string) {
        this.accountId = accountId;
        this.name = name;
    }
}