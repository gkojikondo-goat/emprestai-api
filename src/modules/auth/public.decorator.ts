import { SetMetadata } from '@nestjs/common';

export const ROTA_PUBLICA = 'rotaPublica';

/** Rota que não exige token (spec 002 regra 1: só o /v1/health). */
export const Public = () => SetMetadata(ROTA_PUBLICA, true);
