export type LabelPrintTemplateId = 'A4_2x4' | 'A4_2x5' | 'A4_3x4' | 'CUSTOM';

export interface LabelPrintTemplate {
  id: LabelPrintTemplateId;
  name: string;
  pageWidthMm: number;
  pageHeightMm: number;
  columns: number;
  rows: number;
  gapMm: number;
  pagePaddingMm: number;
  labelPaddingMm: number;
}

export interface LabelPrintCustomOptions {
  columns?: number | null;
  rows?: number | null;
  gapMm?: number | null;
  pagePaddingMm?: number | null;
  labelPaddingMm?: number | null;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number = min): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function resolveLabelPrintTemplate(
  templates: readonly LabelPrintTemplate[],
  selectedId: LabelPrintTemplateId,
  custom: LabelPrintCustomOptions
): LabelPrintTemplate {
  const base = templates.find(t => t.id === selectedId) ?? templates[0];
  if (!base) {
    // Defensive fallback; should never happen with a non-empty templates array.
    return {
      id: 'A4_2x4',
      name: 'A4 — 2×4 (8 per page)',
      pageWidthMm: 210,
      pageHeightMm: 297,
      columns: 2,
      rows: 4,
      gapMm: 6,
      pagePaddingMm: 8,
      labelPaddingMm: 4
    };
  }

  if (selectedId !== 'CUSTOM') return base;

  return {
    ...base,
    columns: clampNumber(custom.columns, 1, 4, base.columns),
    rows: clampNumber(custom.rows, 1, 10, base.rows),
    gapMm: clampNumber(custom.gapMm, 0, 12, base.gapMm),
    pagePaddingMm: clampNumber(custom.pagePaddingMm, 0, 20, base.pagePaddingMm),
    labelPaddingMm: clampNumber(custom.labelPaddingMm, 0, 12, base.labelPaddingMm)
  };
}

