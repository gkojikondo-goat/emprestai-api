import { Controller, Get } from '@nestjs/common';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly service: MeService) {}

  @Get()
  me() {
    return this.service.me();
  }
}
