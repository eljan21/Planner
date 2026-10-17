import { createContext, useContext } from 'react';

// Colours a category can use (matches server PALETTE)
export const PALETTE = [
  { id: 'blue', name: 'Göy' },
  { id: 'orange', name: 'Narıncı' },
  { id: 'green', name: 'Yaşıl' },
  { id: 'pink', name: 'Çəhrayı' },
  { id: 'purple', name: 'Bənövşəyi' },
  { id: 'gray', name: 'Boz' },
  { id: 'red', name: 'Qırmızı' },
  { id: 'teal', name: 'Firuzəyi' },
  { id: 'yellow', name: 'Sarı' },
  { id: 'indigo', name: 'İndiqo' },
];

export const CategoriesContext = createContext({ list: [], byId: new Map() });
export const useCategories = () => useContext(CategoriesContext);

/** "Alış-veriş" → "Al" */
export function initials(name = '') {
  const s = name.trim();
  return s ? s[0].toLocaleUpperCase('az') + (s[1] || '').toLocaleLowerCase('az') : '?';
}
