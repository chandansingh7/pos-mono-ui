import { DEFAULT_LABEL_FIELD_SETTINGS, LabelFieldSettings, parseLabelFieldSettings } from './label-field-settings.util';

describe('label-field-settings.util', () => {
  it('returns defaults when raw is null/undefined', () => {
    expect(parseLabelFieldSettings(null)).toEqual(DEFAULT_LABEL_FIELD_SETTINGS);
    expect(parseLabelFieldSettings(undefined)).toEqual(DEFAULT_LABEL_FIELD_SETTINGS);
  });

  it('fills missing flags from defaults', () => {
    const partial: Partial<LabelFieldSettings> = { showName: false };
    const result = parseLabelFieldSettings(partial);
    expect(result.showName).toBe(false);
    expect(result.showSku).toBe(true);
    expect(result.showPrice).toBe(true);
  });

  it('uses provided boolean values when present', () => {
    const full: LabelFieldSettings = { showName: false, showSku: false, showPrice: true };
    const result = parseLabelFieldSettings(full);
    expect(result).toEqual(full);
  });
});

