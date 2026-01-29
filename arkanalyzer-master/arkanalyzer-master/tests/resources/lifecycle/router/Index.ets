/*
 * 测试资源：带路由跳转的 Component
 * 用于测试 NavigationAnalyzer 的 router.pushUrl 解析
 */

import router from '@ohos.router';

@Entry
@Component
struct Index {
    // 直接字符串参数
    goToDetail1(): void {
        router.pushUrl({ url: 'pages/Detail' });
    }

    // 变量形式的参数
    goToDetail2(): void {
        let options = {
            url: 'pages/Detail'
        };
        router.pushUrl(options);
    }

    // replaceUrl
    goToSettings(): void {
        router.replaceUrl({ url: 'pages/Settings' });
    }

    // router.back
    goBack(): void {
        router.back();
    }

    build() {
        Column() {
            Button('Go to Detail (direct)')
                .onClick(() => this.goToDetail1())
            
            Button('Go to Detail (variable)')
                .onClick(() => this.goToDetail2())
            
            Button('Go to Settings')
                .onClick(() => this.goToSettings())
            
            Button('Go Back')
                .onClick(() => this.goBack())
        }
    }
}
