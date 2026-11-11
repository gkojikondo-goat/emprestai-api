/** Datas civis em America/Sao_Paulo (P4). Formato AAAA-MM-DD. */
export const FUSO = 'America/Sao_Paulo';
export const PRAZO_DIAS = 14;

/** Relógio injetável: produção usa Date.now; testes fixam o instante. */
export const RELOGIO = Symbol('RELOGIO');
export type Relogio = () => Date;

const formatoData = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function hojeEmSaoPaulo(agora: Date): string {
  return formatoData.format(agora);
}

/** Soma dias corridos a uma data civil (sem fuso: aritmética de calendário). */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number) as [number, number, number];
  const u = new Date(Date.UTC(a, m - 1, d + dias));
  return u.toISOString().slice(0, 10);
}
