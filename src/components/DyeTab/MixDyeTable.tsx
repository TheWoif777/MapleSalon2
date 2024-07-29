import { For } from 'solid-js';

import * as Table from '@/components/ui/table';
import { ColorBlock } from './AllColorTable';
import { DyeCharacter } from './DyeCharacter';

export interface MixDyeTableProps {
  avaialbeColorIds: number[];
  getColorHex: (colorId: number) => string;
  getColorId: (colorId: number) => number;
  showFullCharacter?: boolean;
}
export const MixDyeTable = (props: MixDyeTableProps) => {
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header textAlign="center">混染色\基本色</Table.Header>
          <For each={props.avaialbeColorIds}>
            {(colorId) => (
              <Table.Header textAlign="center">
                <ColorBlock
                  style={{ 'background-color': props.getColorHex(colorId) }}
                />
              </Table.Header>
            )}
          </For>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <For each={props.avaialbeColorIds}>
          {(mixColorId) => (
            <Table.Row>
              <Table.Cell textAlign="center">
                <ColorBlock
                  style={{ 'background-color': props.getColorHex(mixColorId) }}
                />
              </Table.Cell>
              <For each={props.avaialbeColorIds}>
                {(colorId) => (
                  <Table.Cell overflow="hidden" textAlign="center">
                    <DyeCharacter
                      category="Hair"
                      hairOverrideId={colorId}
                      showFullCharacter={props.showFullCharacter}
                      dyeId={props.getColorId(mixColorId)}
                    />
                  </Table.Cell>
                )}
              </For>
            </Table.Row>
          )}
        </For>
      </Table.Body>
    </Table.Root>
  );
};
