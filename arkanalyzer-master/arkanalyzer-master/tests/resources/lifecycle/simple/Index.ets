/*
 * 测试资源：简单的 Component
 * 用于测试 AbilityCollector 和 ViewTreeCallbackExtractor 基础功能
 */

@Entry
@Component
struct Index {
    @State count: number = 0;

    aboutToAppear(): void {
        console.log('Index aboutToAppear');
    }

    aboutToDisappear(): void {
        console.log('Index aboutToDisappear');
    }

    handleClick(): void {
        this.count++;
        console.log('Button clicked, count:', this.count);
    }

    build() {
        Column() {
            Text(`Count: ${this.count}`)
                .fontSize(24)
            
            Button('Add')
                .onClick(this.handleClick)
            
            Button('Reset')
                .onClick(() => {
                    this.count = 0;
                })
        }
        .width('100%')
        .height('100%')
    }
}
