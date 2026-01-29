/*
 * 测试资源：入口 Ability（多 Ability 场景）
 * 用于测试 NavigationAnalyzer 的 startAbility 解析
 */

import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';
import common from '@ohos.app.ability.common';

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

    // 跳转到 SecondAbility
    startSecondAbility(): void {
        let want: Want = {
            bundleName: 'com.example.myapp',
            abilityName: 'SecondAbility'
        };
        this.context.startAbility(want);
    }

    onForeground(): void {
        console.log('EntryAbility onForeground');
    }
}
