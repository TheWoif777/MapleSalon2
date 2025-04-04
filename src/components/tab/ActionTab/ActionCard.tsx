import { type Accessor, Switch, Match } from 'solid-js';
import { styled } from 'styled-system/jsx/factory';
import { cq } from 'styled-system/patterns';
import { useTranslate } from '@/context/i18n';

import { HStack } from 'styled-system/jsx/hstack';
import { VStack } from 'styled-system/jsx/vstack';
import { Heading } from '@/components/ui/heading';
import type { ActionCharacterRef } from './ActionCharacter';
import { ExportAnimateButton } from './ExportAnimateButton';
import { ExportFrameButton } from './ExportFrameButton';
import { ExportPartsButton } from './ExportPartsButton';

import {
  CharacterActionNames,
  CharacterSpecialActionNames,
  type CharacterSpecialAction,
  type CharacterAction,
} from '@/const/actions';

export interface ActionCardProps {
  action: CharacterAction | CharacterSpecialAction;
  ref: Accessor<ActionCharacterRef>;
}
export const ActionCard = (props: ActionCardProps) => {
  const t = useTranslate();
  return (
    <CardContainer>
      <CardTitle w="full" class={cq({ name: 'actionHeader' })}>
        <Heading
          size="lg"
          fontSize={{
            base: 'sm',
            '@actionHeader/actionHeaderXs': 'md',
            '@actionHeader/actionHeaderSm': 'lg',
          }}
        >
          <Switch fallback={props.action}>
            <Match when={CharacterActionNames[props.action as CharacterAction]}>
              {(name) => t(name()) as string}
            </Match>
            <Match when={CharacterSpecialActionNames[props.action]}>
              {(name) => t(name()) as string}
            </Match>
          </Switch>
        </Heading>
        <HStack marginLeft="auto">
          <ExportPartsButton
            size="xs"
            variant="outline"
            characterRefs={[props.ref()]}
            isIcon={true}
          />
          <ExportAnimateButton
            size="xs"
            variant="outline"
            characterRefs={[props.ref()]}
            isIcon={true}
          />
          <ExportFrameButton
            size="xs"
            variant="outline"
            characterRefs={[props.ref()]}
            isIcon={true}
          />
        </HStack>
      </CardTitle>
      <CharacterPlaceholder />
    </CardContainer>
  );
};

const CardContainer = styled(VStack, {
  base: {
    width: '100%',
  },
});

const CardTitle = styled(HStack, {
  base: {
    p: 4,
    borderRadius: 'md',
    boxShadow: 'md',
    backgroundColor: 'bg.default',
    width: '100%',
  },
});

const CharacterPlaceholder = styled(VStack, {
  base: {
    w: 'full',
    minHeight: '300px',
  },
});
