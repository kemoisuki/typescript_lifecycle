/*
 * 测试资源：详情页
 */

import router from '@ohos.router';

@Entry
@Component
struct Detail {
    @State message: string = 'Detail Page';

    build() {
        Column() {
            Text(this.message)
                .fontSize(24)
            
            Button('Back')
                .onClick(() => {
                    router.back();
                })
        }
    }
}
