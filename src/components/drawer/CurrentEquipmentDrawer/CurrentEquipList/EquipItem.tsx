import { Show, Switch, Match, createMemo } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { styled } from 'styled-system/jsx/factory';

import { createEquipItemByCategory } from '@/store/character/selector';
import {
  openSkinSelection,
  editCurrentItem,
  removeItems,
} from '@/store/currentEquipDrawer';
import { VStack } from 'styled-system/jsx/vstack';
import { Grid } from 'styled-system/jsx/grid';
import { Box } from 'styled-system/jsx/box';
import { LoadableEquipIcon } from '@/components/elements/LoadableEquipIcon';
import { EllipsisText } from '@/components/ui/ellipsisText';
import { EqipItemActions } from './EquipItemActions';
import { EquipItemHSVInfo } from './EquipItemHSVInfo';
import { EquipItemMixDyeInfo } from './EquipItemMixDyeInfo';
import { ItemNotExistMask } from './ItemNotExistMask';

import { isDyeableId, isMixDyeableId, isSkinPartId } from '@/utils/itemId';

import type { EquipSubCategory } from '@/const/equipments';

export interface EquipItemProps {
  category: EquipSubCategory;
}
export const EquipItem = (props: EquipItemProps) => {
  const item = useStore(createEquipItemByCategory(props.category));

  function handleEdit() {
    const itemInfo = item();
    if (!itemInfo) {
      return;
    }
    if (isSkinPartId(itemInfo.id)) {
      openSkinSelection();
    }
    return editCurrentItem({
      id: itemInfo.id,
      name: itemInfo.name || itemInfo.id.toString(),
    });
  }

  function _handleDelete() {
    removeItems(props.category);
  }

  const handleDelete = createMemo(() => {
    const id = item()?.id;
    if (!id || (id && isSkinPartId(id))) {
      return undefined;
    }
    return _handleDelete;
  });

  return (
    <Show when={item()}>
      {(item) => (
        <EquipItemContainer>
          <EquipItemIcon>
            <LoadableEquipIcon id={item().id} name={item().name} />
          </EquipItemIcon>
          <EquipItemInfo gap="4px">
            <EquipItemName>
              <Show when={item().name} fallback={item().id}>
                <EllipsisText as="div" title={item().name}>
                  {item().name}
                </EllipsisText>
              </Show>
            </EquipItemName>
            <Switch>
              <Match when={isDyeableId(item().id)}>
                <EquipItemHSVInfo
                  hue={item().hue}
                  saturation={item().saturation}
                  value={item().brightness}
                />
              </Match>
              <Match when={isMixDyeableId(item().id) && item().dye}>
                <EquipItemMixDyeInfo id={item().id} dyeInfo={item().dye} />
              </Match>
            </Switch>
          </EquipItemInfo>
          <EqipItemActions onEdit={handleEdit} onDelete={handleDelete()} />
          <ItemNotExistMask id={item().id} />
        </EquipItemContainer>
      )}
    </Show>
  );
};

export const EquipItemContainer = styled(Grid, {
  base: {
    py: '1',
    px: '2',
    borderRadius: 'md',
    bg: 'bg.default',
    width: 'full',
    shadow: 'sm',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    position: 'relative',
  },
});

export const EquipItemIcon = styled(Box, {
  base: {
    p: '1',
    borderRadius: 'sm',
    backgroundColor: 'bg.subtle',
    _dark: {
      backgroundColor: 'gray.8',
    },
  },
});

export const EquipItemName = styled(Box, {
  base: {
    flex: '1',
    fontSize: 'sm',
    width: 'full',
  },
});

export const EquipItemInfo = styled(VStack, {
  base: {
    flex: '1',
    gap: '1',
    alignItems: 'flex-start',
    overflow: 'hidden',
    color: 'colorPalette.text',
  },
});
