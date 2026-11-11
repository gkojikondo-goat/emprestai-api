import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  EmprestimoCriadoDto,
  MeusEmprestimosDto,
  SolicitarEmprestimoDto,
} from './emprestimos.schemas';
import { EmprestimosService } from './emprestimos.service';

/** Spec 006. Colaborador e Operações podem pedir para si (P10). */
@ApiTags('emprestimos')
@ApiBearerAuth()
@Controller('emprestimos')
export class EmprestimosController {
  constructor(private readonly service: EmprestimosService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ operationId: 'solicitarEmprestimo', summary: 'Pedir um equipamento disponível' })
  @ZodResponse({ status: 201, type: EmprestimoCriadoDto })
  solicitar(@Body() corpo: SolicitarEmprestimoDto) {
    return this.service.solicitar(corpo.equipamentoId);
  }

  @Get('meus')
  @ApiOperation({ operationId: 'meusEmprestimos', summary: 'Empréstimos em aberto de quem chama' })
  @ZodResponse({ status: 200, type: MeusEmprestimosDto })
  meus() {
    return this.service.meus();
  }
}
