import { hojeEmSaoPaulo, PRAZO_DIAS, somarDias } from './datas';

describe('datas em America/Sao_Paulo', () => {
  it('[006 CA-02] hoje é a data civil de São Paulo, inclusive perto da meia-noite', () => {
    // 02:30 UTC de 11/11 ainda é 23:30 de 10/11 em São Paulo (UTC-3).
    expect(hojeEmSaoPaulo(new Date('2026-11-11T02:30:00Z'))).toBe('2026-11-10');
    expect(hojeEmSaoPaulo(new Date('2026-11-11T03:00:00Z'))).toBe('2026-11-11');
  });

  it('[006 CA-02] devolver até = hoje + 14 dias corridos, virando mês e ano', () => {
    expect(PRAZO_DIAS).toBe(14);
    expect(somarDias('2026-11-10', 14)).toBe('2026-11-24');
    expect(somarDias('2026-12-25', 14)).toBe('2027-01-08');
    expect(somarDias('2027-02-20', 14)).toBe('2027-03-06');
  });
});
