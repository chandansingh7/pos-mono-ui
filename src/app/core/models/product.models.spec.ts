import { getUnitLabel, SALE_UNITS, SALE_UNIT_TYPES } from './product.models';

describe('product.models', () => {
  describe('getUnitLabel', () => {
    it('returns "each" for null or undefined', () => {
      expect(getUnitLabel(null)).toBe('each');
      expect(getUnitLabel(undefined)).toBe('each');
    });

    it('returns correct label for weight units', () => {
      expect(getUnitLabel('kg')).toBe('kg');
      expect(getUnitLabel('g')).toBe('g');
      expect(getUnitLabel('lb')).toBe('lb');
      expect(getUnitLabel('oz')).toBe('oz');
    });

    it('returns correct label for volume units', () => {
      expect(getUnitLabel('L')).toBe('L');
      expect(getUnitLabel('ml')).toBe('ml');
      expect(getUnitLabel('gal')).toBe('gal');
      expect(getUnitLabel('fl_oz')).toBe('fl oz');
    });

    it('returns "each" for piece', () => {
      expect(getUnitLabel('each')).toBe('each');
    });
  });

  describe('SALE_UNIT_TYPES', () => {
    it('includes PIECE, WEIGHT, VOLUME', () => {
      const values = SALE_UNIT_TYPES.map(t => t.value);
      expect(values).toContain('PIECE');
      expect(values).toContain('WEIGHT');
      expect(values).toContain('VOLUME');
    });
  });

  describe('SALE_UNITS', () => {
    it('has units for each type', () => {
      expect(SALE_UNITS['PIECE'].length).toBeGreaterThan(0);
      expect(SALE_UNITS['WEIGHT'].length).toBeGreaterThan(0);
      expect(SALE_UNITS['VOLUME'].length).toBeGreaterThan(0);
    });
  });
});
