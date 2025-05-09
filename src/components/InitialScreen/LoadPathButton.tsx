import { createSignal, Show } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { exists } from '@tauri-apps/plugin-fs';
import { styled } from 'styled-system/jsx/factory';

import { useTranslate } from '@/context/i18n';

import { $isWzLoading, initByWzBase } from '@/store/initialize';

import LoaderCircle from 'lucide-solid/icons/loader-circle';
import { Button } from '@/components/ui/button';

import { toaster } from '@/components/GlobalToast';

export interface LoadPathButtonProps {
  path: string;
}
export const LoadPathButton = (props: LoadPathButtonProps) => {
  const t = useTranslate();
  const isGlobalWzLoading = useStore($isWzLoading);
  const [isLoading, setIsLoading] = createSignal(false);

  async function handleClick() {
    if (isGlobalWzLoading()) {
      return;
    }
    const isExist = await exists(props.path);
    if (!isExist) {
      toaster.error({
        title: t('initial.fileOrPathNotExist'),
      });
      return;
    }
    setIsLoading(true);
    try {
      await initByWzBase(props.path, t);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={isLoading() || isGlobalWzLoading()}
    >
      <Show when={isLoading()}>
        <Loading>
          <LoaderCircle />
        </Loading>
      </Show>
      {t('initial.loadExistBaseWz')}
    </Button>
  );
};

const Loading = styled('div', {
  base: {
    animation: 'rotate infinite 1s linear',
    color: 'fg.muted',
  },
});
