import { deepMap, computed } from 'nanostores';

import { Store } from '@tauri-apps/plugin-store';

import {
  WindowResolutions,
  isValidResolution,
  type Resolution,
} from '@/const/setting/window';

const SAVE_FILENAME = 'setting.bin';

const SAVE_KEY = 'setting';

/** file selection save, a presistence store on file */
export const fileStore = new Store(SAVE_FILENAME);

export interface AppSetting extends Record<string, unknown> {
  windowResizable: boolean;
  windowResolution: Resolution;
}

const DEFAULT_SETTING: AppSetting = {
  windowResizable: true,
  windowResolution: WindowResolutions[0].name,
};

export const $appSetting = deepMap<AppSetting>(DEFAULT_SETTING);

/* selector */
export const $windowResizable = computed(
  $appSetting,
  (setting) => setting.windowResizable,
);
export const $windowResolution = computed(
  $appSetting,
  (setting) => setting.windowResolution,
);

/* action */
export async function initializeSavedSetting() {
  try {
    const setting = await fileStore.get<AppSetting | undefined>(SAVE_KEY);
    if (setting) {
      $appSetting.setKey('windowResizable', !!setting.windowResizable);
      if (isValidResolution(setting.windowResolution)) {
        $appSetting.setKey('windowResolution', setting.windowResolution);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export async function saveSetting() {
  const setting = $appSetting.get();
  await fileStore.set(SAVE_KEY, setting);
  await fileStore.save();
}

export function setWindowResizable(value: boolean) {
  $appSetting.setKey('windowResizable', value);
}
export function setWindowResolution(value: Resolution) {
  $appSetting.setKey('windowResolution', value);
}
