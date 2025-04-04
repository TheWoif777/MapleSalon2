import type { SystemStyleObject } from 'styled-system/types';
import type { I18nKeys } from '@/context/i18n';
import { css } from 'styled-system/css';

export enum PreviewScene {
  Alpha = 'alpha',
  Grid = 'grid',
  Color = 'color',
  Henesys = 'henesys',
  Custom = 'custom',
  MapleMap = 'mapleMap',
}

export const PreviewSceneNames: Record<PreviewScene, I18nKeys> = {
  [PreviewScene.Alpha]: 'scene.sceneAlpha',
  [PreviewScene.Grid]: 'scene.sceneGrid',
  [PreviewScene.Color]: 'scene.sceneColor',
  [PreviewScene.Henesys]: 'scene.sceneHenesys',
  [PreviewScene.Custom]: 'scene.sceneCustom',
  [PreviewScene.MapleMap]: 'scene.sceneMapleMap',
};

export const PreviewSceneBackground: Record<PreviewScene, SystemStyleObject> = {
  [PreviewScene.Alpha]: {
    backgroundImage:
      'conic-gradient(white 90deg, #999 90deg, #999 180deg, white 180deg, white 270deg, #999 270deg, #999 360deg, white 360deg)',
    backgroundSize: '16px 16px',
    backgroundRepeat: 'repeat',
  },
  [PreviewScene.Grid]: {
    backgroundColor: '#eee',
    backgroundImage:
      'linear-gradient(90deg, #ccc 1px, transparent 0), linear-gradient(180deg, #ccc 1px, transparent 0)',
    backgroundSize: '12px 12px',
    backgroundPosition: '6px 6px',
    backgroundRepeat: 'repeat',
  },
  [PreviewScene.Color]: {},
  [PreviewScene.MapleMap]: {},
  [PreviewScene.Custom]: {
    backgroundPosition: 'center center',
  },
  [PreviewScene.Henesys]: {
    backgroundImage: 'henesysBackground',
  },
};
/* for panda css generate css token */
const _ = [
  css.raw(PreviewSceneBackground.grid),
  css.raw(PreviewSceneBackground.alpha),
  css.raw(PreviewSceneBackground.henesys),
  css.raw(PreviewSceneBackground.custom),
];

export const PreviewSceneThemeMap: Record<PreviewScene, string> = {
  [PreviewScene.Alpha]: 'light',
  [PreviewScene.Grid]: 'light',
  [PreviewScene.Color]: 'light',
  [PreviewScene.Henesys]: 'light',
  [PreviewScene.Custom]: 'light',
  [PreviewScene.MapleMap]: 'light',
};
