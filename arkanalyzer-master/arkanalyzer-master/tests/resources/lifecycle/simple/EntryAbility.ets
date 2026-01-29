/*
 * 测试资源：简单的 Ability
 * 用于测试 AbilityCollector 基础功能
 */

import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';

export default class EntryAbility extends UIAbility {
    onCreate(want: Want, launchParam: LaunchParam): void {
        console.log('EntryAbility onCreate');
    }

    onWindowStageCreate(windowStage: window.WindowStage): void {
        windowStage.loadContent('pages/Index', (err) => {
            if (err) {
                console.error('Failed to load content');
            }
        });
    }

    onForeground(): void {
        console.log('EntryAbility onForeground');
    }

    onBackground(): void {
        console.log('EntryAbility onBackground');
    }

    onDestroy(): void {
        console.log('EntryAbility onDestroy');
    }
}
