export interface LabelFieldSettings {
  showName: boolean;
  showSku: boolean;
  showPrice: boolean;
}

export const DEFAULT_LABEL_FIELD_SETTINGS: LabelFieldSettings = {
  showName: true,
  showSku: true,
  showPrice: true
};

export function parseLabelFieldSettings(raw: unknown): LabelFieldSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LABEL_FIELD_SETTINGS };
  }

  const base = raw as Partial<LabelFieldSettings>;
  return {
    showName: typeof base.showName === 'boolean' ? base.showName : DEFAULT_LABEL_FIELD_SETTINGS.showName,
    showSku: typeof base.showSku === 'boolean' ? base.showSku : DEFAULT_LABEL_FIELD_SETTINGS.showSku,
    showPrice: typeof base.showPrice === 'boolean' ? base.showPrice : DEFAULT_LABEL_FIELD_SETTINGS.showPrice
  };
}

