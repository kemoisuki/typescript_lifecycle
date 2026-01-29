/*
 * 测试资源：第二个 Ability
 * 用于测试多 Ability 场景
 */

import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';

export default class SecondAbility extends UIAbility {
    onCreate(want: Want, launchParam: LaunchParam): void {
        console.log('SecondAbility onCreate');
    }

    onWindowStageCreate(windowStage: window.WindowStage): void {
        windowStage.loadContent('pages/SecondPage', (err) => {
            if (err) {
                console.error('Failed to load content');
            }
        });
    }

    onForeground(): void {
        console.log('SecondAbility onForeground');
    }
}
