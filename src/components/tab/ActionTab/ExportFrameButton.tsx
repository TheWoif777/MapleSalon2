import { createSignal, Show } from 'solid-js';

import { $padWhiteSpaceWhenExportFrame } from '@/store/settingDialog';
import { $forceExportEffect } from '@/store/toolTab';
import { $globalRenderer } from '@/store/renderer';

import { useActionTab } from './ActionTabContext';
import { useTranslate } from '@/context/i18n';

import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionCharacterRef } from './ActionCharacter';
import { SpinLoading } from '@/components/elements/SpinLoading';

import ImagesIcon from 'lucide-solid/icons/images';
import { toaster } from '@/components/GlobalToast';
import { batchExportCharacterFrames } from './batchExportCharacterFrames';
import { getCharacterFrameBlobs } from './helper';
import { makeBlobsZipBlob } from '@/utils/exportImage/exportBlobToZip';
import { downloadBlob } from '@/utils/download';
import { nextTick } from '@/utils/eventLoop';

export interface ExportFrameButtonProps {
  characterRefs: ActionCharacterRef[];
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  isIcon?: boolean;
}
export const ExportFrameButton = (props: ExportFrameButtonProps) => {
  const t = useTranslate();
  const [state, { startExport, finishExport }] = useActionTab();
  const [isExporting, setIsExporting] = createSignal(false);

  function tooManyImageWarning() {
    if (!$forceExportEffect.get()) {
      return;
    }
    toaster.create({
      title: t('export.exporting'),
      description: t('export.effectExportDesc'),
    });
  }

  async function handleClick() {
    if (isExporting() || state.isExporting) {
      return;
    }
    const isAllLoaded =
      props.characterRefs.every(
        (characterRef) => !characterRef.character.isLoading,
      ) && props.characterRefs.length !== 0;
    if (!isAllLoaded) {
      toaster.error({
        title: t('export.actionNotLoaded'),
      });
      return;
    }
    startExport();
    setIsExporting(true);
    await nextTick();
    const padWhiteSpace = $padWhiteSpaceWhenExportFrame.get();

    if (props.characterRefs.length > 5) {
      tooManyImageWarning();
    }

    try {
      const files: [Blob, string][] = [];
      if (props.characterRefs.length > 1 && $forceExportEffect.get()) {
        const exportCharacterData = await batchExportCharacterFrames(
          props.characterRefs.map((ref) => ref.character),
          $globalRenderer.get().renderer,
          {
            padWhiteSpace,
          },
        );
        await Promise.all(
          exportCharacterData.map(async ([character, data]) => {
            files.push(
              ...(await getCharacterFrameBlobs(data, character, {
                includeMoveJson: padWhiteSpace === false,
              })),
            );
          }),
        );
      } else {
        for await (const characterRef of props.characterRefs) {
          const frameData = await characterRef.makeCharacterFrames({
            padWhiteSpace,
          });
          const fileBlobs = await getCharacterFrameBlobs(
            frameData,
            characterRef.character,
            {
              includeMoveJson: padWhiteSpace === false,
            },
          );
          files.push(...fileBlobs);
        }
      }
      if (files.length === 1) {
        const file = files[0];
        downloadBlob(file[0], file[1]);
      } else {
        const zipBlob = await makeBlobsZipBlob(files);
        const fileName = 'character-action-split-frame.zip';
        downloadBlob(zipBlob, fileName);
      }
      toaster.success({
        title: t('export.success'),
      });
    } catch (_) {
      toaster.error({
        title: t('export.error'),
      });
    } finally {
      setIsExporting(false);
      finishExport();
    }
  }

  return (
    <Button
      size={props.size}
      variant={props.variant}
      title={t('export.animationFrames')}
      onClick={handleClick}
      disabled={isExporting() || state.isExporting}
    >
      <Show when={props.isIcon} fallback={t('export.frames')}>
        <ImagesIcon />
      </Show>
      <Show when={isExporting()}>
        <SpinLoading size={16} />
      </Show>
    </Button>
  );
};
