import { createContext, useContext } from 'react';
import { tr } from './i18n';

// Colours a category can use (matches server PALETTE)
const colour = (id, az, en) => ({ id, get name() { return tr(az, en); } });
export const PALETTE = [
  colour('blue', 'Göy', 'Blue'),
  colour('orange', 'Narıncı', 'Orange'),
  colour('green', 'Yaşıl', 'Green'),
  colour('pink', 'Çəhrayı', 'Pink'),
  colour('purple', 'Bənövşəyi', 'Purple'),
  colour('gray', 'Boz', 'Grey'),
  colour('red', 'Qırmızı', 'Red'),
  colour('teal', 'Firuzəyi', 'Teal'),
  colour('yellow', 'Sarı', 'Yellow'),
  colour('indigo', 'İndiqo', 'Indigo'),
];

export const CategoriesContext = createContext({ list: [], byId: new Map() });
export const useCategories = () => useContext(CategoriesContext);

/** "Alış-veriş" → "Al" */
export function initials(name = '') {
  const s = name.trim();
  return s ? s[0].toLocaleUpperCase('az') + (s[1] || '').toLocaleLowerCase('az') : '?';
}
