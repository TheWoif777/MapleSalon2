import type { CharacterItems } from './store';

import type { EquipSubCategory } from '@/const/equipments';
import type { ItemInfo } from '@/renderer/character/const/data';

export function getCharacterSubCategory(category: EquipSubCategory) {
  if (category === 'CashWeapon') {
    return 'Weapon';
  }
  return category;
}

export function getUpdateItems(
  before: Partial<CharacterItems>,
  changes: Partial<CharacterItems>,
): Partial<CharacterItems> {
  const result: Partial<CharacterItems> = {};
  /* add not delete item to result  */
  for (const key in before) {
    const k = key as EquipSubCategory;
    const changeItem = changes[k];
    const isNotDeleted = !changes[k]?.isDeleted;
    if (isNotDeleted) {
      if (changeItem) {
        result[k] = Object.assign({}, before[k], changes[k]);
      } else {
        result[k] = before[k];
      }
      const updated = result[k];
      if (updated?.isDeleteDye) {
        updated.dye = undefined;
      }
    }
  }
  /* add new item to result  */
  for (const key in changes) {
    const k = key as EquipSubCategory;
    const isNewCategory = !before[k];
    if (isNewCategory && !changes[k]?.isDeleted) {
      result[k] = changes[k] as ItemInfo;
    }
  }

  return result;
}
