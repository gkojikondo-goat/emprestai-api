import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { MeDto } from './me.schemas';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly service: MeService) {}

  @Get()
  @ZodResponse({ type: MeDto, description: 'Quem está chamando, com tenant e papel.' })
  me() {
    return this.service.me();
  }
}
