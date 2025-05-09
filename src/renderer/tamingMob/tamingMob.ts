import { Container, Ticker } from 'pixi.js';

import type { CharacterData } from '@/store/character/store';
import { CharacterLoader } from '../character/loader';

import type { Vec2 } from './const/data';
import type { WzTamingMobData } from './const/wz';
import type { Zmap } from '../character/const/data';
import type { Character } from '../character/character';
import type { Chair } from '../chair/chair';
import { CharacterAction } from '@/const/actions';

import { TamingMobItem } from './tamingMobItem';

export class TamingMob extends Container {
  id: number;
  wz?: WzTamingMobData;

  _hideBody = false;

  action: CharacterAction | string = CharacterAction.Stand1;
  actionItem: Map<CharacterAction | string, TamingMobItem> = new Map();

  sitAction = CharacterAction.Sit;

  characters: [Character, CharacterData][] = [];
  tamingMobLayers = new Map<number, Container>();
  currentNavel = { x: 0, y: 0 };

  /* delta to calculate is need enter next frame */
  currentDelta = 0;
  currentTicker?: (delta: Ticker) => void;
  instructionFrame = 0;
  currentItem?: TamingMobItem;

  extraAvatarCount = 0;

  isPlaying = false;

  constructor(id: number) {
    super();
    this.id = id;
    this.sortableChildren = true;
  }
  get isChair() {
    return !!this.wz?.sit;
  }
  get isHideWeapon() {
    return !!this.wz?.info?.invisibleWeapon;
  }
  get isHideCape() {
    return !!this.wz?.info?.invisibleCape;
  }
  get isHideEffect() {
    const hide1 = !!this.wz?.info?.removeEffect;
    const hide2 = !!this.wz?.info?.removeEffectAll;
    return hide1 || hide2;
  }
  get isHideBody() {
    return !!this.wz?.info?.removeBody || this._hideBody;
  }
  get actions() {
    return Array.from(this.actionItem.keys());
  }
  async load() {
    if (!this.wz) {
      const data = await CharacterLoader.getPieceWzByPath<WzTamingMobData>(
        `Character/TamingMob/${this.id.toString().padStart(8, '0')}.img`,
      );
      if (data) {
        this.wz = data;
      }
    }

    if (!(this.wz && this.actionItem.size === 0)) {
      return;
    }

    this.extraAvatarCount =
      this.wz?.info?.customVehicle?.togetherVehicleInfo?.avatarCount || 0;

    for (const action of Object.keys(this.wz)) {
      if (
        action === 'info' ||
        action === 'characterAction' ||
        action === 'forcingItem'
      ) {
        continue;
      }

      const item = this.wz[action];
      const defaultAction =
        this.wz.characterAction?.[action as CharacterAction];
      const isHideBodyAction =
        (defaultAction as unknown as string) === 'hideBody';
      if (isHideBodyAction) {
        this._hideBody = true;
      }

      if (item && !this.actionItem.has(action)) {
        this.actionItem.set(
          action,
          new TamingMobItem(
            action,
            item,
            this,
            isHideBodyAction
              ? CharacterAction.Sit
              : defaultAction
                ? defaultAction
                : action === CharacterAction.Sit
                  ? this.sitAction
                  : undefined,
          ),
        );
      }
    }
  }
  /**
   * @usage 
    ```ts
    await tamingMob.load();
    await tamingMob.sitCharacter([
      [ch, data],
    ]);
    ```
  */
  async sitCharacter(
    characters: [Character, CharacterData][],
    forceAction?: string,
  ) {
    // only do one character currently
    const characterAction = forceAction || characters[0][1].action;
    const tamingMobItem = this.actionItem.get(characterAction);

    if (!tamingMobItem) {
      return;
    }
    this.action = characterAction;
    this.currentItem = tamingMobItem;
    this.characters = characters;

    await tamingMobItem.loadResource();

    await this.putCharacters();

    this.playFrame();
  }
  async putCharacters() {
    if (!this.currentItem) {
      return;
    }

    const characterContainer = this.getOrCreatEffectLayer(40);
    const avatarInfo =
      this.wz?.info?.customVehicle?.togetherVehicleInfo?.avatarInfo || [];

    for (let i = 0; i <= this.extraAvatarCount; i++) {
      const [ch, data] = this.characters[i] || [];
      if (!ch) {
        continue;
      }
      const otherInfo = i > 0 ? avatarInfo[i - 1] : undefined;
      ch.customInstructions = this.currentItem?.instructions;
      if (this.isHideBody) {
        ch.isHideBody = true;
      } else {
        ch.isHideBody = false;
      }
      await ch.update({
        ...data,
        isAnimating: true,
        showNameTag: false,
      });
      if (i > 0) {
        ch.toggleEffectVisibility(true);
        const offset = otherInfo?.pos[this.action as 'ladder'] ||
          otherInfo?.pos.default || { x: 0, y: 0 };
        ch.offset = offset;
      }

      characterContainer.addChild(ch);
    }
  }
  playByInstructions() {
    const character = this.characters[0]?.[0];
    if (!character || this.isPlaying) {
      return;
    }
    const maxFrame = character.currentInstructions.length;
    this.isPlaying = true;
    this.playFrame();
    this.currentTicker = (delta) => {
      const currentDuration =
        character.currentInstructions[this.instructionFrame]?.delay || 100;
      this.currentDelta += delta.deltaMS;
      if (this.currentDelta > currentDuration) {
        this.currentDelta %= currentDuration;
        if (this.instructionFrame + 1 >= maxFrame) {
          this.instructionFrame = 0;
        } else {
          this.instructionFrame += 1;
        }
        this.playFrame();
      }
    };
    Ticker.shared.add(this.currentTicker);
  }
  playFrame() {
    const character = this.characters[0]?.[0];
    const zmap = CharacterLoader?.zmap;

    if (!(character && this.currentItem && zmap)) {
      return;
    }

    const frame = this.instructionFrame;

    this.currentItem.removePreviousFrameParts(frame);
    const pieces = this.currentItem.getFrameParts(frame);
    const frameNavel = this.currentItem.getFrameNavel(frame);

    for (let i = 0; i <= this.extraAvatarCount; i++) {
      const [ch] = this.characters[i] || [];
      if (!ch) {
        continue;
      }
      ch.instructionFrame = this.instructionFrame;
      ch.playBodyFrame();
      const offset = {
        x: frameNavel.x + ch.offset.x,
        y: frameNavel.y + ch.offset.y,
      };
      if (i === 0) {
        offset.x += ch.bodyFrame.pivot.x;
        offset.y += ch.bodyFrame.pivot.y;
      }
      ch.bodyContainer.position.set(offset.x, offset.y);
      ch.chatBalloon.position.set(offset.x - 10, offset.y - 60);
    }

    for (const piece of pieces) {
      if (piece.destroyed) {
        continue;
      }
      const z =
        piece.frameData.z === undefined
          ? -1
          : Number.isInteger(piece.frameData.z)
            ? (piece.frameData.z as number) + 40
            : piece.frameData.z;
      const container = this.getOrCreatEffectLayer(z, zmap);
      container.addChild(piece);
    }
    this.currentItem.isAncherForChair &&
      this.fixChairAncherIfExist({
        x: -frameNavel.x,
        y: -frameNavel.y,
      });
  }
  stop() {
    this.isPlaying = false;
    this.currentDelta = 0;
    if (this.currentTicker) {
      Ticker.shared.remove(this.currentTicker);
      this.currentTicker = undefined;
    }
  }
  resetDelta(resetCharacter = true) {
    this.currentDelta = 0;
    this.instructionFrame = 0;
    if (resetCharacter) {
      this.characters[0]?.[0].resetDelta();
    }
    // clear the effect, seens playFrame only remove the "previous" frame parts, need to make sure all parts are removed
    for (const layer of this.tamingMobLayers.values()) {
      if (layer.zIndex !== 40) {
        layer.removeChildren();
      }
    }

    this.playFrame();
  }
  fixChairAncherIfExist(ancher: Vec2) {
    const chairNode = this.parent?.parent?.parent?.parent as Chair;
    if (chairNode?.type === 'chair') {
      chairNode.updatePartAncher(ancher);
    }
  }
  getOrCreatEffectLayer(zIndex: string | number, zmap?: Zmap) {
    const index =
      typeof zIndex === 'string' ? zmap?.indexOf(zIndex) || -1 : zIndex;
    let container = this.tamingMobLayers.get(index);
    if (!container) {
      container = new Container();
      container.zIndex = index;
      this.addChild(container);
      this.tamingMobLayers.set(index, container);
    }
    return container;
  }
  destroy() {
    this.stop();
    const character = this.characters[0]?.[0];
    if (character) {
      character.customInstructions = [];
      character.offset = { x: 0, y: 0 };
      character.bodyContainer.position.set(0, 0);
      character.chatBalloon.position.set(-10, -60);
    }
    super.destroy();
    this.actionItem.clear();
    this.tamingMobLayers.clear();
  }
}
