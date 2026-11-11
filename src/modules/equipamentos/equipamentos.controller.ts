import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ListaEquipamentosDto, ListarEquipamentosQueryDto } from './equipamentos.schemas';
import { EquipamentosService } from './equipamentos.service';

/** Spec 004. Colaborador e Operações leem a mesma lista (CA-10). */
@ApiTags('equipamentos')
@ApiBearerAuth()
@Controller('equipamentos')
export class EquipamentosController {
  constructor(private readonly service: EquipamentosService) {}

  @Get()
  @ApiOperation({ operationId: 'listarEquipamentos', summary: 'Catálogo do tenant' })
  @ZodResponse({ status: 200, type: ListaEquipamentosDto })
  listar(@Query() query: ListarEquipamentosQueryDto) {
    return this.service.listar(query);
  }
}
