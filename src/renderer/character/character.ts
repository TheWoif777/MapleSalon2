import { createUniqueId } from 'solid-js';
import { type Application, Container, Ticker, EventEmitter } from 'pixi.js';

import type { ItemInfo, AncherName, Vec2, PieceSlot } from './const/data';
import type { CategorizedItem } from './categorizedItem';
import type { CharacterAnimatablePart } from './characterAnimatablePart';
import type {
  CharacterItemPiece,
  DyeableCharacterItemPiece,
} from './itemPiece';

import { CharacterLoader } from './loader';
import { CharacterItem } from './item';

import { isMixDyeableId } from '@/utils/itemId';

import { CharacterAction, isBackAction } from '@/const/actions';
import { CharacterExpressions } from '@/const/emotions';
import { CharacterEarType } from '@/const/ears';
import { CharacterHandType } from '@/const/hand';
import type { PieceIslot } from './const/slot';

type AnyCategorizedItem = CategorizedItem<string>;

class ZmapContainer extends Container {
  name: PieceSlot;
  character: Character;
  requireLocks: PieceSlot[];

  constructor(name: PieceSlot, index: number, character: Character) {
    super();
    this.name = name;
    this.zIndex = index;
    this.character = character;
    this.requireLocks =
      (CharacterLoader.smap?.[name] || '').match(/.{1,2}/g) || [];
  }
  addCharacterPart(child: CharacterAnimatablePart) {
    this.addChild(child);
    this.refreshLock();
  }
  hasAllLocks(id: number, locks: string[]) {
    return locks.every((lock) => {
      const requiredLock = this.character.locks.get(lock);
      return !requiredLock || requiredLock === id;
    });
  }
  refreshLock() {
    for (const child of this.children) {
      const frame = (child as CharacterAnimatablePart).frames[0];
      if (!frame || !frame.item) {
        continue;
      }
      // using the fewer locks
      let locks =
        frame.item.vslot.length < this.requireLocks.length
          ? frame.item.vslot
          : this.requireLocks;

      // force Cap using vslot
      if (frame.item.islot.includes('Cp')) {
        locks = frame.item.vslot;
      }

      // this logic is from maplestory.js, but why
      if (this.name === 'mailArm') {
        locks = ['Ma'];
      } else if (this.name === 'pants' || this.name === 'backPants') {
        locks = ['Pn'];
      }

      if (this.hasAllLocks(frame.info.id, locks)) {
        child.visible = true;
      } else {
        child.visible = false;
      }
    }
  }
}

export interface CharacterAttributes {
  action: CharacterAction;
  expression: CharacterExpressions;
  earType: CharacterEarType;
  handType: CharacterHandType;
}

export class Character extends Container {
  idItems = new Map<number, CharacterItem>();
  actionAnchers = new Map<CharacterAction, Map<AncherName, Vec2>[]>();

  #_action = CharacterAction.Jump;
  #_expression: CharacterExpressions = CharacterExpressions.Default;
  #_earType = CharacterEarType.HumanEar;
  #_handType = CharacterHandType.DoubleHand;
  #_renderId = '';

  zmapLayers = new Map<PieceSlot, ZmapContainer>();
  locks = new Map<PieceSlot, number>();

  frame = 0;
  /** is character playing bounced action */
  isBounce = false;

  /* delta to calculate is need enter next frame */
  currentDelta = 0;
  currentTicker?: (delta: Ticker) => void;

  app: Application;

  isLoading = false;
  loadFlashTimer = 0;
  loadEvent = new EventEmitter<'loading' | 'loaded'>();

  constructor(app: Application) {
    super();
    this.sortableChildren = true;
    this.app = app;
  }

  get action() {
    return this.#_action;
  }
  get expression() {
    return this.#_expression;
  }
  get earType() {
    return this.#_earType;
  }
  get handType() {
    return this.#_handType;
  }
  set action(action: CharacterAction) {
    this.#_action = action;

    this.updateFaceVisibilityByAction();
    this.updateHandTypeByAction();

    this.loadItems();
  }
  set expression(expression: CharacterExpressions) {
    this.#_expression = expression;
    this.loadItems();
  }
  set earType(earType: CharacterEarType) {
    this.#_earType = earType;
    this.loadItems();
  }
  set handType(handType: CharacterHandType) {
    this.#_handType = handType;

    this.updateActionByHandType();

    this.loadItems();
  }
  batchUpdateAttribute(attributes: Partial<CharacterAttributes>) {
    if (attributes.action) {
      this.#_action = attributes.action;
      this.updateFaceVisibilityByAction();
      this.updateHandTypeByAction();
    }
    if (attributes.expression) {
      this.#_expression = attributes.expression;
    }
    if (attributes.earType) {
      this.#_earType = attributes.earType;
    }
    if (attributes.handType) {
      this.#_handType = attributes.handType;
      this.updateActionByHandType();
    }
    this.loadItems();
  }

  updateItems(items: ItemInfo[]) {
    let isAddItem = false;
    for (const item of items) {
      if (this.idItems.has(item.id)) {
        this.updateFilter(item.id, item);
        if (isMixDyeableId(item.id)) {
          this.updateMixDye(item.id, item);
        }
      } else {
        isAddItem = true;
        const chItem = new CharacterItem(item, this);
        this.idItems.set(item.id, chItem);
      }
    }
    for (const item of this.idItems.keys()) {
      if (!items.find((i) => i.id === item)) {
        const removedItem = this.idItems.get(item);
        removedItem?.destroy();
        this.idItems.delete(item);
      }
    }
    if (isAddItem) {
      this.loadItems();
    }
  }

  updateFilter(id: number, info: ItemInfo) {
    const item = this.idItems.get(id);
    if (!item) {
      return;
    }
    item.info = info;
    item.updateFilter();
  }
  updateMixDye(id: number, info: ItemInfo) {
    const item = this.idItems.get(id);
    if (!item) {
      return;
    }
    item.info = info;
    /* only update sprite already in render */
    const dyeableSprites = this.currentPieces
      .filter((piece) => piece.item.info.id === id)
      .flatMap((piece) =>
        piece.frames.filter((frame) => frame.isDyeable()),
      ) as DyeableCharacterItemPiece[];
    for (const sprites of dyeableSprites) {
      sprites.updateDye();
    }
  }

  /** get current items filter by expression and action */
  get currentAllItem() {
    return Array.from(this.idItems.values())
      .map((item) => {
        return item.isUseExpressionItem
          ? item.actionPieces.get(this.expression)
          : item.actionPieces.get(this.action);
      })
      .filter((item) => item) as AnyCategorizedItem[];
  }

  /** get current pieces in character layers */
  get currentPieces() {
    return Array.from(this.zmapLayers.values()).flatMap(
      (layer) => layer.children as CharacterAnimatablePart[],
    );
  }

  render() {
    const zmap = CharacterLoader?.zmap;
    if (!zmap) {
      return;
    }
    this.reset();
    const pieces: CharacterAnimatablePart[] = [];
    let body: CharacterAnimatablePart | undefined = undefined;
    const items = this.currentAllItem;
    for (const layer of zmap) {
      for (const item of items) {
        const piece = item.items.get(layer);
        if (piece) {
          let container = this.zmapLayers.get(layer);
          if (!container) {
            container = new ZmapContainer(layer, zmap.indexOf(layer), this);
            this.addChild(container);
            this.zmapLayers.set(layer, container);
          }
          if (
            isBackAction(this.action) &&
            layer.toLocaleLowerCase().includes('face')
          ) {
            container.visible = false;
          }
          if (layer === 'body' || layer === 'backBody') {
            body = piece;
          }
          // not sure why need to do this while it already initialized in constructor
          piece.frameChanges(0);

          pieces.push(piece);

          container.addCharacterPart(piece);
        }
      }
    }

    if (!body) {
      console.error('No body found');
      return;
    }

    this.playPieces(this.currentPieces);
    this.playByBody(body);

    this.isLoading = false;
    this.loadEvent.emit('loaded');
  }

  reset() {
    this.isBounce = false;
    this.isLoading = false;
    this.currentTicker && Ticker.shared.remove(this.currentTicker);
    this.clearnContainerChild();
  }
  clearnContainerChild() {
    for (const child of this.zmapLayers.values()) {
      for (const pieces of child.children) {
        if ('stop' in pieces) {
          (pieces as CharacterAnimatablePart).stop();
        }
      }
      child.removeChildren();
    }
  }

  /** play character action by body's delay */
  playByBody(body: CharacterAnimatablePart) {
    const pieces = this.currentPieces;
    const maxFrame = body.frames.length;
    const needBounce =
      this.action === CharacterAction.Alert || this.action.startsWith('stand');

    this.currentTicker = (delta) => {
      this.currentDelta += delta.deltaMS;
      if (this.currentDelta > body.currentDuration) {
        this.currentDelta = 0;
        if (needBounce) {
          if (this.frame >= maxFrame - 1) {
            this.isBounce = true;
          }
          if (this.frame <= 0) {
            this.isBounce = false;
          }
          this.frame += this.isBounce ? -1 : 1;
        } else {
          this.frame += 1;
          if (this.frame >= maxFrame) {
            this.frame = 0;
          }
        }
        this.playPieces(pieces);
      }
    };

    Ticker.shared.add(this.currentTicker);
  }

  /** set pieces to current frame */
  playPieces(pieces: CharacterAnimatablePart[]) {
    const frame = this.frame;

    const currentAncher = this.actionAnchers.get(this.action)?.[frame];

    if (!currentAncher) {
      return;
    }
    for (const piece of pieces) {
      const pieceFrameIndex = piece.frames[frame] ? frame : 0;
      const pieceFrame = (piece.frames[frame] ||
        piece.frames[0]) as CharacterItemPiece;
      const isSkinGroup = pieceFrame.group === 'skin';
      if (pieceFrame) {
        const ancherName = pieceFrame.baseAncherName;
        const ancher = currentAncher.get(ancherName);
        /* setting the ancher on zmapLayer */
        ancher && piece.parent?.position.copyFrom(ancher);
        /* some part can play indenpendently */
        if (piece.canIndependentlyPlay && !isSkinGroup) {
          if (!piece.playing) {
            piece.play();
          }
        } else {
          piece.currentFrame = pieceFrameIndex;
        }
      }
    }
    this.updateCharacterFaceVisibility();
    /* update pivot after all pieces is set */
    this.updateCharacterPivotByBodyPiece();
  }

  /** update face when character turn to back */
  updateCharacterFaceVisibility() {
    const faceLayer = this.zmapLayers.get('face');
    if (faceLayer) {
      if (this.isCurrentFrameIsBackAction) {
        faceLayer.visible = false;
      } else {
        faceLayer.visible = true;
      }
    }
  }
  updateCharacterPivotByBodyPiece() {
    /* use the ancher to set actual character offset */
    const bodyPos = this.currentBodyFrame?.ancher || { x: 0, y: 0 };
    this.pivot.set(bodyPos.x, bodyPos.y);
  }

  /** use backBody to check current action is turn character to back  */
  get isCurrentFrameIsBackAction() {
    const backLayer = this.zmapLayers.get('backBody');
    const backBodyNode = backLayer?.children[0] as
      | CharacterAnimatablePart
      | undefined;
    const isEmptyNode = backBodyNode?.frames[this.frame]?.zIndex !== -1;
    return backBodyNode && isEmptyNode;
  }

  get currentBodyFrame() {
    const body = this.zmapLayers.get('body');
    const bodyNode = body?.children[0] as CharacterAnimatablePart;
    const bodyFrame = bodyNode?.frames[this.frame];
    if (bodyFrame && bodyFrame.zIndex !== -1) {
      return bodyFrame;
    }
    const back = this.zmapLayers.get('backBody');
    const backNode = back?.children[0] as CharacterAnimatablePart;
    return backNode?.frames[this.frame];
  }

  get isAllAncherBuilt() {
    return Array.from(this.idItems.values()).every(
      (item) => item.isAllAncherBuilt,
    );
  }

  async loadItems() {
    const renderId = createUniqueId();
    this.#_renderId = renderId;

    if (this.isLoading) {
      clearTimeout(this.loadFlashTimer);
      this.loadEvent.emit('loading');
    }

    this.isLoading = true;
    // only show loading after 100ms
    this.loadFlashTimer = setTimeout(() => {
      if (this.isLoading) {
        this.loadEvent.emit('loading');
      }
    }, 100);
    for await (const item of this.idItems.values()) {
      await item.load();
      if (item.isUseExpressionItem) {
        await item.prepareActionResource(this.expression);
      } else {
        await item.prepareActionResource(this.action);
      }
    }

    if (this.#_renderId !== renderId) {
      return;
    }

    const itemCount = this.idItems.size;
    // try to build ancher but up to 2 times of item count
    for (let i = 0; i < itemCount * 4; i++) {
      if (this.isAllAncherBuilt) {
        break;
      }
      this.buildAncher();
    }

    this.buildLock();

    this.render();
  }

  buildLock() {
    const orderedItems = CharacterLoader.zmap?.reduce((acc, layer) => {
      for (const item of this.idItems.values()) {
        if (item.islot.includes(layer as PieceIslot)) {
          acc.push(item);
        }
      }
      return acc;
    }, [] as CharacterItem[]);

    if (!orderedItems) {
      return;
    }
    for (const item of orderedItems) {
      for (const slot of item.vslot) {
        this.locks.set(slot, item.info.id);
      }
    }
  }

  buildAncher() {
    for (const action of Object.values(CharacterAction)) {
      for (const item of this.idItems.values()) {
        const ancher = this.actionAnchers.get(action);
        this.actionAnchers.set(
          action,
          item.tryBuildAncher(action, ancher || []),
        );
      }
    }
  }

  private updateFaceVisibilityByAction() {
    const faceLayer = this.zmapLayers.get('face');
    if (faceLayer) {
      if (isBackAction(this.action)) {
        faceLayer.visible = false;
      } else {
        faceLayer.visible = true;
      }
    }
  }
  private updateActionByHandType() {
    if (this.#_handType === CharacterHandType.SingleHand) {
      if (this.action === CharacterAction.Walk2) {
        this.#_action = CharacterAction.Walk1;
      } else if (this.action === CharacterAction.Stand2) {
        this.#_action = CharacterAction.Stand1;
      }
    } else if (this.#_handType === CharacterHandType.DoubleHand) {
      if (this.action === CharacterAction.Walk1) {
        this.#_action = CharacterAction.Walk2;
      } else if (this.action === CharacterAction.Stand1) {
        this.#_action = CharacterAction.Stand2;
      }
    }
  }
  private updateHandTypeByAction() {
    if (
      (this.action === CharacterAction.Walk1 ||
        this.action === CharacterAction.Stand1) &&
      this.#_handType === CharacterHandType.DoubleHand
    ) {
      this.#_handType = CharacterHandType.SingleHand;
    } else if (
      (this.action === CharacterAction.Walk2 ||
        this.action === CharacterAction.Stand2) &&
      this.#_handType === CharacterHandType.SingleHand
    ) {
      this.#_handType = CharacterHandType.DoubleHand;
    }
  }
}
