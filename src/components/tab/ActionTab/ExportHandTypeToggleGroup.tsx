import { createMemo } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { useTranslate, useLocale } from '@/context/i18n';

import { $actionExportHandType } from '@/store/toolTab';

import {
  SimpleToggleGroup,
  type ValueChangeDetails,
} from '@/components/ui/toggleGroup';

import { CharacterHandType } from '@/const/hand';

export const ExportHandTypeToggleGroup = () => {
  const locale = useLocale();
  const t = useTranslate();
  const handType = useStore($actionExportHandType);

  function handleExportTypeChange(details: ValueChangeDetails) {
    const firstItem = details.value;
    firstItem && $actionExportHandType.set(firstItem as CharacterHandType);
  }
  const options = createMemo(() => {
    const _ = locale();
    return [
      {
        label: t('character.handTypeNormal'),
        value: CharacterHandType.SingleHand,
      },
      {
        label: t('character.handTypeGun'),
        value: CharacterHandType.Gun,
      },
    ];
  });

  return (
    <SimpleToggleGroup
      size="sm"
      options={options()}
      value={handType()}
      onValueChange={handleExportTypeChange}
    />
  );
};
