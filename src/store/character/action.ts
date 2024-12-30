import {
  type CharacterData,
  $currentItem,
  $currentCharacterItems,
  $currentCharacterInfo,
  $currentItemChanges,
  $currentInfoChanges,
} from './store';
import {
  $totalItems,
  getCurrentHairColor,
  getCurrentFaceColor,
} from './selector';
import { removeItems } from '@/store/currentEquipDrawer';
import { getEquipById } from '@/store/string';
import { appendHistory } from '@/store/equipHistory';
import {
  getCharacterSubCategory,
  deepCloneCharacterItems,
  copyHsvInfo,
} from './utils';

import {
  getHairColorId,
  gatHairAvailableColorIds,
  changeHairColorId,
  getFaceColorId,
  gatFaceAvailableColorIds,
  changeFaceColorId,
} from '@/utils/mixDye';
import { getSubCategory, getBodyId, getHeadIdFromBodyId } from '@/utils/itemId';

import { EquipCategory, type EquipSubCategory } from '@/const/equipments';
import type { CharacterAction } from '@/const/actions';
import type { CharacterExpressions } from '@/const/emotions';
import type { CharacterEarType } from '@/const/ears';
import type { CharacterHandType } from '@/const/hand';

export function changeCurrentCharacter(character: Partial<CharacterData>) {
  if (character.items) {
    $currentCharacterItems.set({});
    $currentCharacterItems.set(deepCloneCharacterItems(character.items));
    const updateInfo = { ...$currentCharacterInfo.get() };
    if (character.id) {
      updateInfo.id = character.id;
    }
    if (character.name) {
      updateInfo.name = character.name;
    }
    if (character.action) {
      updateInfo.action = character.action;
    }
    if (character.expression) {
      updateInfo.expression = character.expression;
    }
    if (character.earType) {
      updateInfo.earType = character.earType;
    }
    if (character.handType) {
      updateInfo.handType = character.handType;
    }
    if (character.showNameTag !== undefined) {
      updateInfo.showNameTag = character.showNameTag;
    }
    if (character.nameTagId) {
      updateInfo.nameTagId = character.nameTagId;
    } else {
      updateInfo.nameTagId = undefined;
    }
    if (character.chatBalloonId) {
      updateInfo.chatBalloonId = character.chatBalloonId;
    } else {
      updateInfo.chatBalloonId = undefined;
    }
    $currentCharacterInfo.set(updateInfo);

    $currentItem.set(undefined);
    $currentItemChanges.set({});
  }
}

export function applyCharacterChanges() {
  $currentCharacterItems.set(deepCloneCharacterItems($totalItems.get()));
  $currentCharacterInfo.set({
    ...$currentCharacterInfo.get(),
    ...$currentInfoChanges.get(),
  });
  resetCharacterChanges();
}
export function resetCharacterChanges() {
  $currentItemChanges.set({});
  $currentInfoChanges.set({});
}

export function updateChangesSkin(item: {
  id: number;
  name: string;
}) {
  const bodyId = getBodyId(item.id);
  const headId = getHeadIdFromBodyId(bodyId);

  const currentChanges = $totalItems.get();

  $currentItemChanges.setKey(
    'Body',
    Object.assign({}, currentChanges.Body, { id: bodyId, name: item.name }),
  );
  $currentItemChanges.setKey(
    'Head',
    Object.assign({}, currentChanges.Head, { id: headId, name: item.name }),
  );
}

const getColorItemUseSameColor =
  <ColorType extends number>(
    getCurrentColor: () => ColorType,
    getColorId: (id: number) => ColorType,
    getAvailableColorIds: (id: number) => number[],
    changeColorId: (id: number, color: ColorType) => number,
  ) =>
  (item: { id: number; name: string }) => {
    const currentItemColor = getCurrentColor();
    const itemColor = getColorId(item.id);

    const itemInfo = Object.assign({}, item);

    if (itemColor !== currentItemColor) {
      itemInfo.id = changeColorId(item.id, currentItemColor);
      const avaiableColorIds = getAvailableColorIds(item.id);

      /* if color is not available, use the first one */
      if (
        avaiableColorIds.length > 0 &&
        !avaiableColorIds.includes(itemInfo.id)
      ) {
        itemInfo.id = avaiableColorIds[0];
      } else {
        /* if not, just use original one */
        itemInfo.id = item.id;
      }

      const newEquipInfo = getEquipById(itemInfo.id);

      if (newEquipInfo) {
        itemInfo.name = newEquipInfo.name;
      }
    }

    return itemInfo;
  };

export const getHairItemUseSameColor = getColorItemUseSameColor(
  getCurrentHairColor,
  getHairColorId,
  gatHairAvailableColorIds,
  changeHairColorId,
);

export const getFaceItemUseSameColor = getColorItemUseSameColor(
  getCurrentFaceColor,
  getFaceColorId,
  gatFaceAvailableColorIds,
  changeFaceColorId,
);

export function addItemToChangesIfNeeded(item: {
  id: number;
  name: string;
}) {
  let category = getSubCategory(item.id);
  if (!category) {
    return;
  }
  category = getCharacterSubCategory(category);
  if (!category) {
    return;
  }

  const currentItems = $currentItemChanges.get();

  const currentItem = currentItems[category];

  if (currentItem?.id === item.id) {
    return;
  }

  if (currentItem) {
    return $currentItemChanges.setKey(
      category,
      Object.assign({}, currentItem, {
        id: item.id,
        name: item.name,
        isDeleted: false,
      }),
    );
  }

  const originItem = $currentCharacterItems.get()[category];

  if (originItem) {
    $currentItemChanges.setKey(
      category,
      Object.assign({}, originItem, {
        id: item.id,
        name: item.name,
        isDeleted: false,
      }),
    );
  } else {
    $currentItemChanges.setKey(category, {
      id: item.id,
      name: item.name,
      isDeleted: false,
    });
  }
}

export function addDyeableToChanges(
  category: 'Hair' | 'Face',
  item: {
    id: number;
    name: string;
  },
) {
  const originItem = $totalItems.get()[category];
  /* if not set isDeleteDye, set isDeleteDye when not have any dye data */
  const isDeleteDye = originItem?.isDeleteDye ?? !originItem?.dye;
  const hsvInfo = originItem ? copyHsvInfo(originItem) : {};

  $currentItem.set(item);
  $currentItemChanges.setKey(category, {
    id: item.id,
    name: item.name,
    dye: originItem?.dye ? Object.assign({}, originItem?.dye) : undefined,
    isDeleted: false,
    isDeleteDye,
    ...hsvInfo,
  });
}

export function addItemToChanges(
  category: EquipSubCategory,
  item: {
    id: number;
    name: string;
    hasEffect?: boolean;
  },
) {
  const currentItems = $totalItems.get();

  if (currentItems[category]) {
    $currentItemChanges.setKey(
      category,
      Object.assign({}, currentItems[category], {
        id: item.id,
        name: item.name,
        isDeleted: false,
        enableEffect: item.hasEffect ? true : undefined,
      }),
    );
  } else {
    $currentItemChanges.setKey(category, {
      id: item.id,
      name: item.name,
      isDeleted: false,
      enableEffect: item.hasEffect ? true : undefined,
    });
  }
}

export function selectNewItem(
  item: {
    id: number;
    name: string;
    hasEffect?: boolean;
    isDyeable?: boolean;
    isNameTag?: boolean;
    isChatBalloon?: boolean;
  },
  addToHistory = true,
) {
  if (item.isNameTag || item.isChatBalloon) {
    appendHistory({
      category: EquipCategory.Unknown,
      id: item.id,
      name: item.name,
      isNameTag: item.isNameTag,
      isChatBalloon: item.isChatBalloon,
    });
    return item.isNameTag
      ? setCharacterNameTag(item.id)
      : setCharacterChatBalloon(item.id);
  }

  let category = getSubCategory(item.id);
  if (!category) {
    return;
  }
  category = getCharacterSubCategory(category);
  if (!category) {
    return;
  }

  if (addToHistory) {
    /* append to history */
    appendHistory({
      category: EquipCategory.Unknown,
      id: item.id,
      name: item.name,
      hasEffect: item.hasEffect ?? false,
      isDyeable: item.isDyeable ?? false,
    });
  }

  if (category === 'Hair') {
    const itemInfo = getHairItemUseSameColor(item);
    return addDyeableToChanges('Hair', itemInfo);
  }

  if (category === 'Face') {
    const itemInfo = getFaceItemUseSameColor(item);
    return addDyeableToChanges('Face', itemInfo);
  }

  $currentItem.set(item);

  if (category === 'Skin') {
    return updateChangesSkin(item);
  }

  /* remove conflict category */
  if (category === 'Coat' || category === 'Pants') {
    removeItems('Overall');
  } else if (category === 'Longcoat' || category === 'Overall') {
    removeItems('Coat');
    removeItems('Pants');
  }

  return addItemToChanges(category, item);
}

export function updateItemHsvInfo(
  category: EquipSubCategory,
  field: 'colorRange' | 'hue' | 'saturation' | 'brightness' | 'alpha',
  value: number,
) {
  const hasChanges = $currentItemChanges.get()[category];
  if (hasChanges) {
    $currentItemChanges.setKey(`${category}.${field}`, value);
  } else {
    const currentItem = $totalItems.get()[category];

    if (!currentItem) {
      return;
    }

    /* fill the changes first and then modify the value */
    $currentItemChanges.setKey(
      category,
      Object.assign({}, currentItem, {
        [field]: value,
      }),
    );
  }
}
export function batchUpdateItemHsvInfo(
  category: EquipSubCategory,
  fields: Partial<
    Record<'hue' | 'saturation' | 'brightness' | 'alpha', number>
  >,
) {
  const changesData = $currentItemChanges.get()[category];
  if (changesData) {
    $currentItemChanges.setKey(category, {
      ...changesData,
      ...fields,
    });
  } else {
    const currentItem = $totalItems.get()[category];

    if (!currentItem) {
      return;
    }

    /* fill the changes first and then modify the value */
    $currentItemChanges.setKey(
      category,
      Object.assign({}, currentItem, fields),
    );
  }
}
export function resetItemHsvInfo(category: EquipSubCategory) {
  const currentItems = $totalItems.get();
  const originItem = currentItems[category];
  if (originItem) {
    $currentItemChanges.setKey(
      category,
      Object.assign({}, originItem, {
        colorRange: 0,
        hue: 0,
        saturation: 0,
        brightness: 0,
        alpha: 1,
      }),
    );
  }
}
/* info actions */
export function toggleIsAnimating(isAnimating: boolean) {
  $currentCharacterInfo.setKey('isAnimating', isAnimating);
}
export function setCharacterAction(action: CharacterAction) {
  $currentCharacterInfo.setKey('action', action);
}
export function setCharacterExpression(expression: CharacterExpressions) {
  $currentCharacterInfo.setKey('expression', expression);
}
export function toggleShowChatBalloon(isShow: boolean) {
  $currentCharacterInfo.setKey('showChatBalloon', isShow);
}
export function setCharacterEarType(earType: CharacterEarType) {
  $currentInfoChanges.setKey('earType', earType);
}
export function setCharacterHandType(handType: CharacterHandType) {
  $currentInfoChanges.setKey('handType', handType);
}
export function toggleShowNameTag(isShow: boolean) {
  $currentInfoChanges.setKey('showNameTag', isShow);
}
export function setCharacterNameTag(id: number | undefined) {
  $currentInfoChanges.setKey('nameTagId', id);
}
export function setCharacterChatBalloon(id: number | undefined) {
  $currentInfoChanges.setKey('chatBalloonId', id);
}
export function setCharacterName(name: string) {
  $currentInfoChanges.setKey('name', name);
}
