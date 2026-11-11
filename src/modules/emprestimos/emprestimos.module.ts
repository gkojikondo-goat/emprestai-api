import { Module } from '@nestjs/common';
import { RELOGIO } from '../../common/datas';
import { EmprestimosController } from './emprestimos.controller';
import { EmprestimosRepository } from './emprestimos.repository';
import { EmprestimosService } from './emprestimos.service';

@Module({
  controllers: [EmprestimosController],
  providers: [
    EmprestimosService,
    EmprestimosRepository,
    { provide: RELOGIO, useValue: () => new Date() },
  ],
})
export class EmprestimosModule {}
