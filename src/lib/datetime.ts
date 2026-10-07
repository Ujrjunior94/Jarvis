/**
 * JARVIS — Núcleo de Assistência Digital
 * Módulo Centralizado de Data e Hora Dinâmica
 * Fuso horário padrão: America/Bahia (UTC-3)
 */

export interface JarvisDateTime {
  iso: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  dayOfWeek: string; // 'domingo' | 'segunda-feira' | 'terça-feira' ...
  dayOfWeekIndex: number; // 0 (Domingo) a 6 (Sábado)
  timezone: string; // 'America/Bahia'
  timestamp: number; // Epoch ms
  formattedPtBR: string; // "DD/MM/YYYY às HH:mm:ss"
}

const TIMEZONE = 'America/Bahia';

const DAYS_OF_WEEK_PT_BR = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

// Suporte para simulação determinística em testes
let mockDateOverride: Date | null = null;

export function setMockCurrentDateTime(date: Date | null): void {
  mockDateOverride = date;
}

export function resetMockCurrentDateTime(): void {
  mockDateOverride = null;
}

/**
 * Retorna os dados completos e precisos da data e hora atual em America/Bahia.
 * Nunca utiliza datas estáticas.
 */
export function getCurrentDateTime(referenceDate?: Date): JarvisDateTime {
  const base = referenceDate || mockDateOverride || new Date();

  // Obter representação no fuso horário America/Bahia
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hour12: false,
  });

  const parts = formatter.formatToParts(base);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const hour = partMap.hour || '00';
  const minute = partMap.minute || '00';
  const second = partMap.second || '00';

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}:${second}`;

  // Calcular índice do dia da semana baseado na data local da Bahia
  const localDateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
  const dayOfWeekIndex = localDateObj.getUTCDay();
  const dayOfWeek = DAYS_OF_WEEK_PT_BR[dayOfWeekIndex] || 'segunda-feira';

  // America/Bahia é UTC-3 (sem horário de verão atualmente)
  const isoOffset = `${dateStr}T${timeStr}.000-03:00`;

  return {
    iso: isoOffset,
    date: dateStr,
    time: timeStr,
    dayOfWeek,
    dayOfWeekIndex,
    timezone: TIMEZONE,
    timestamp: base.getTime(),
    formattedPtBR: `${day}/${month}/${year} às ${timeStr}`,
  };
}

/**
 * Retorna uma data no formato YYYY-MM-DD deslocada por N dias em relação à data atual (ou base).
 */
export function getRelativeDate(offsetDays: number, baseDate?: Date): string {
  const current = getCurrentDateTime(baseDate);
  const [y, m, d] = current.date.split('-').map(Number);
  const targetUtc = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  const ty = targetUtc.getUTCFullYear();
  const tm = String(targetUtc.getUTCMonth() + 1).padStart(2, '0');
  const td = String(targetUtc.getUTCDate()).padStart(2, '0');
  return `${ty}-${tm}-${td}`;
}

/**
 * Resolve períodos naturais para intervalos de data no formato YYYY-MM-DD
 */
export function resolvePeriodInterval(
  period: 'hoje' | 'amanha' | 'ontem' | 'esta_semana' | 'semana_passada' | 'mes_atual' | 'mes_passado',
  baseDate?: Date
): { inicio: string; fim: string; label: string } {
  const current = getCurrentDateTime(baseDate);
  const [y, m, d] = current.date.split('-').map(Number);

  switch (period) {
    case 'hoje':
      return { inicio: current.date, fim: current.date, label: 'Hoje' };
    case 'amanha': {
      const am = getRelativeDate(1, baseDate);
      return { inicio: am, fim: am, label: 'Amanhã' };
    }
    case 'ontem': {
      const ont = getRelativeDate(-1, baseDate);
      return { inicio: ont, fim: ont, label: 'Ontem' };
    }
    case 'esta_semana': {
      // Semana começa na segunda-feira (1)
      const dayIndex = current.dayOfWeekIndex; // 0 = Domingo, 1 = Segunda, ...
      const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
      const mondayDate = getRelativeDate(diffToMonday, baseDate);
      const sundayDate = getRelativeDate(diffToMonday + 6, baseDate);
      return { inicio: mondayDate, fim: sundayDate, label: 'Esta Semana' };
    }
    case 'semana_passada': {
      const dayIndex = current.dayOfWeekIndex;
      const diffToMonday = (dayIndex === 0 ? -6 : 1 - dayIndex) - 7;
      const prevMonday = getRelativeDate(diffToMonday, baseDate);
      const prevSunday = getRelativeDate(diffToMonday + 6, baseDate);
      return { inicio: prevMonday, fim: prevSunday, label: 'Semana Passada' };
    }
    case 'mes_atual': {
      const inicio = `${y}-${String(m).padStart(2, '0')}-01`;
      // Último dia do mês atual
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const fim = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { inicio, fim, label: 'Mês Atual' };
    }
    case 'mes_passado': {
      const prevMonthUtc = new Date(Date.UTC(y, m - 2, 1));
      const py = prevMonthUtc.getUTCFullYear();
      const pm = prevMonthUtc.getUTCMonth() + 1;
      const lastDayPrev = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      const inicio = `${py}-${String(pm).padStart(2, '0')}-01`;
      const fim = `${py}-${String(pm).padStart(2, '0')}-${String(lastDayPrev).padStart(2, '0')}`;
      return { inicio, fim, label: 'Mês Passado' };
    }
    default:
      return { inicio: current.date, fim: current.date, label: 'Hoje' };
  }
}
