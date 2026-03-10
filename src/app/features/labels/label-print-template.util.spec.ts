import { clampNumber, resolveLabelPrintTemplate, LabelPrintTemplate } from './label-print-template.util';

describe('label-print-template.util', () => {
  const templates: LabelPrintTemplate[] = [
    { id: 'A4_2x4', name: '8', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, gapMm: 6, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'CUSTOM', name: 'Custom', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, gapMm: 6, pagePaddingMm: 8, labelPaddingMm: 4 }
  ];

  it('clampNumber clamps and falls back', () => {
    expect(clampNumber(5, 1, 4)).toBe(4);
    expect(clampNumber(0, 1, 4)).toBe(1);
    expect(clampNumber('3', 1, 4)).toBe(3);
    expect(clampNumber('bad', 1, 4, 2)).toBe(2);
  });

  it('resolveLabelPrintTemplate returns base template for non-custom', () => {
    const tpl = resolveLabelPrintTemplate(templates, 'A4_2x4', { columns: 4, rows: 10 });
    expect(tpl.id).toBe('A4_2x4');
    expect(tpl.columns).toBe(2);
    expect(tpl.rows).toBe(4);
  });

  it('resolveLabelPrintTemplate applies clamped custom overrides', () => {
    const tpl = resolveLabelPrintTemplate(templates, 'CUSTOM', {
      columns: 99,
      rows: 0,
      gapMm: -1,
      pagePaddingMm: 100,
      labelPaddingMm: 7
    });

    expect(tpl.id).toBe('CUSTOM');
    expect(tpl.columns).toBe(4); // max
    expect(tpl.rows).toBe(1); // min
    expect(tpl.gapMm).toBe(0); // min
    expect(tpl.pagePaddingMm).toBe(20); // max
    expect(tpl.labelPaddingMm).toBe(7);
  });
});

