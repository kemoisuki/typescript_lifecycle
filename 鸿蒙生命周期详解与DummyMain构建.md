# 鸿蒙系统生命周期详解与DummyMain构建

## 一、鸿蒙应用的基本结构

### 1.1 鸿蒙应用 vs Android应用 对比

```
┌─────────────────────────────────────────────────────────────────────┐
│                        鸿蒙应用结构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     Application                              │   │
│   │                     (应用级别)                                │   │
│   └───────────────────────────┬─────────────────────────────────┘   │
│                               │                                      │
│           ┌───────────────────┼───────────────────┐                 │
│           │                   │                   │                  │
│           ▼                   ▼                   ▼                  │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │
│   │  UIAbility    │   │  UIAbility    │   │  UIAbility    │        │
│   │  (能力1)      │   │  (能力2)      │   │  (能力3)      │        │
│   │               │   │               │   │               │        │
│   │  类似Android  │   │               │   │               │        │
│   │  的Activity   │   │               │   │               │        │
│   └───────┬───────┘   └───────────────┘   └───────────────┘        │
│           │                                                          │
│           │ loadContent()                                           │
│           ▼                                                          │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                    WindowStage (窗口)                      │     │
│   │                                                            │     │
│   │    ┌─────────────────────────────────────────────────┐    │     │
│   │    │              Page (页面)                         │    │     │
│   │    │              @Entry @Component                   │    │     │
│   │    │                                                  │    │     │
│   │    │    ┌────────────────────────────────────────┐   │    │     │
│   │    │    │     子组件 @Component                   │   │    │     │
│   │    │    │     (类似Android的Fragment)            │   │    │     │
│   │    │    └────────────────────────────────────────┘   │    │     │
│   │    │                                                  │    │     │
│   │    └─────────────────────────────────────────────────┘    │     │
│   └───────────────────────────────────────────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念对照表

| Android | 鸿蒙 | 说明 |
|---------|------|------|
| Activity | UIAbility | 应用的基本功能单元 |
| Fragment | @Component子组件 | 可复用的UI片段 |
| View | ArkUI组件 | UI基本元素 |
| Intent | Want | 组件间通信 |
| Bundle | AbilityConstant | 启动参数 |

---

## 二、鸿蒙的两层生命周期

鸿蒙有**两层**生命周期，这是理解的关键：

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  第一层: UIAbility生命周期 (应用/能力级别)                           │
│  ════════════════════════════════════════                           │
│                                                                      │
│  onCreate → onWindowStageCreate → onForeground ←→ onBackground      │
│                                   → onWindowStageDestroy → onDestroy │
│                                                                      │
│  这一层控制: 应用的创建、窗口的创建、前后台切换、销毁               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  第二层: Page/Component生命周期 (页面/组件级别)                      │
│  ════════════════════════════════════════════════                   │
│                                                                      │
│  aboutToAppear → onPageShow ←→ onPageHide → aboutToDisappear        │
│                                                                      │
│  这一层控制: 页面的显示、隐藏、组件的创建和销毁                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、UIAbility生命周期详解

### 3.1 UIAbility是什么？

UIAbility是鸿蒙应用的**基本功能单元**，类似于Android的Activity。

```typescript
// 一个典型的UIAbility
export default class EntryAbility extends UIAbility {
    
    // 1. 创建时调用
    onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
        console.log('Ability onCreate');
        // 在这里初始化数据
    }
    
    // 2. 窗口创建时调用
    onWindowStageCreate(windowStage: window.WindowStage): void {
        console.log('Ability onWindowStageCreate');
        // 加载页面
        windowStage.loadContent('pages/Index');
    }
    
    // 3. 进入前台时调用
    onForeground(): void {
        console.log('Ability onForeground');
        // 恢复UI、刷新数据
    }
    
    // 4. 进入后台时调用
    onBackground(): void {
        console.log('Ability onBackground');
        // 暂停动画、保存状态
    }
    
    // 5. 窗口销毁时调用
    onWindowStageDestroy(): void {
        console.log('Ability onWindowStageDestroy');
        // 释放UI资源
    }
    
    // 6. 销毁时调用
    onDestroy(): void {
        console.log('Ability onDestroy');
        // 清理所有资源
    }
}
```

### 3.2 UIAbility生命周期流程图

```
                        ┌─────────────────┐
                        │   用户启动应用   │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   onCreate()    │  ← 第1步: 创建Ability
                        │                 │     初始化数据
                        └────────┬────────┘
                                 │
                                 ▼
                   ┌──────────────────────────┐
                   │  onWindowStageCreate()   │  ← 第2步: 创建窗口
                   │                          │     加载页面内容
                   │  windowStage.loadContent │     loadContent('pages/Index')
                   │  ('pages/Index')         │
                   └────────────┬─────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  onForeground() │  ← 第3步: 进入前台
                        │                 │     应用可见可交互
                        └────────┬────────┘
                                 │
                                 │
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        │              ★ 应用运行中 ★                      │
        │                                                  │
        │    用户可以:                                     │
        │    • 点击按钮                                    │
        │    • 滑动页面                                    │
        │    • 输入文字                                    │
        │    • 切换页面                                    │
        │                                                  │
        └────────────────────────┬────────────────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │                       │
                     ▼                       ▼
           ┌─────────────────┐     ┌─────────────────┐
           │ 用户按Home键    │     │ 用户关闭应用    │
           │ 或切换到其他应用│     │                 │
           └────────┬────────┘     └────────┬────────┘
                    │                       │
                    ▼                       │
           ┌─────────────────┐              │
           │  onBackground() │  ← 进入后台  │
           │                 │              │
           └────────┬────────┘              │
                    │                       │
        ┌───────────┴───────────┐           │
        │                       │           │
        ▼                       ▼           │
┌───────────────┐      ┌───────────────┐    │
│ 用户返回应用  │      │ 系统回收内存  │    │
└───────┬───────┘      └───────┬───────┘    │
        │                      │            │
        ▼                      │            │
┌─────────────────┐            │            │
│  onForeground() │  ← 重回前台│            │
└─────────────────┘            │            │
                               ▼            ▼
                   ┌──────────────────────────┐
                   │  onWindowStageDestroy()  │  ← 窗口销毁
                   └────────────┬─────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   onDestroy()   │  ← 最终销毁
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    应用结束     │
                        └─────────────────┘
```

### 3.3 关键跳转关系

```
UIAbility生命周期的跳转规则:
═══════════════════════════════════════════════════════════════════

正常启动流程 (顺序执行):
─────────────────────────────────────────────────────────────────
onCreate() → onWindowStageCreate() → onForeground()


前后台切换 (可循环):
─────────────────────────────────────────────────────────────────
                    ┌──────────────────────┐
                    │                      │
                    ▼                      │
            onForeground() ────────► onBackground()
                    ▲                      │
                    │                      │
                    └──────────────────────┘
                    
用户切换到其他应用 → onBackground()
用户返回本应用 → onForeground()


销毁流程 (顺序执行):
─────────────────────────────────────────────────────────────────
onBackground() → onWindowStageDestroy() → onDestroy()
```

---

## 四、Page/Component生命周期详解

### 4.1 Page组件是什么？

Page是鸿蒙的**页面组件**，用`@Entry`和`@Component`装饰器标记。

```typescript
// 一个典型的Page组件
@Entry                    // ← 表示这是入口页面
@Component                // ← 表示这是一个组件
struct IndexPage {
    @State private data: string = "";
    
    // 1. 组件即将出现时调用
    aboutToAppear(): void {
        console.log('组件即将显示');
        this.data = this.loadData();  // 初始化数据
    }
    
    // 2. 页面显示时调用 (仅@Entry页面有)
    onPageShow(): void {
        console.log('页面显示了');
        this.refreshUI();  // 刷新界面
    }
    
    // 3. 页面隐藏时调用 (仅@Entry页面有)
    onPageHide(): void {
        console.log('页面隐藏了');
        this.pauseAnimation();  // 暂停动画
    }
    
    // 4. 组件即将消失时调用
    aboutToDisappear(): void {
        console.log('组件即将销毁');
        this.cleanup();  // 清理资源
    }
    
    // 构建UI
    build() {
        Column() {
            Text(this.data)
            Button('点击').onClick(() => {
                // 用户交互
            })
        }
    }
}
```

### 4.2 Page生命周期流程图

```
                        ┌─────────────────┐
                        │   页面被创建    │
                        │ (loadContent)   │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ aboutToAppear() │  ← 第1步: 组件即将出现
                        │                 │     在这里初始化数据
                        │  • 初始化状态   │     获取网络数据等
                        │  • 获取数据     │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  onPageShow()   │  ← 第2步: 页面显示
                        │                 │     页面可见了
                        │  • 开始动画     │     可以开始动画
                        │  • 刷新UI       │
                        └────────┬────────┘
                                 │
                                 │
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        │              ★ 页面活跃中 ★                      │
        │                                                  │
        │    用户可以:                                     │
        │    • onClick() - 点击按钮                        │
        │    • onTouch() - 触摸屏幕                        │
        │    • onScroll() - 滚动列表                       │
        │    • 修改@State状态触发UI更新                    │
        │                                                  │
        └────────────────────────┬────────────────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │                       │
                     ▼                       ▼
           ┌─────────────────┐     ┌─────────────────┐
           │ 跳转到其他页面  │     │ 返回/关闭页面   │
           │ (router.push)  │     │ (router.back)   │
           └────────┬────────┘     └────────┬────────┘
                    │                       │
                    ▼                       │
           ┌─────────────────┐              │
           │  onPageHide()   │  ← 页面隐藏  │
           │                 │              │
           │  • 暂停动画     │              │
           │  • 保存状态     │              │
           └────────┬────────┘              │
                    │                       │
        ┌───────────┴───────────┐           │
        │                       │           │
        ▼                       ▼           │
┌───────────────┐      ┌───────────────┐    │
│ 用户返回此页面│      │ 页面被销毁    │    │
│ (router.back) │      │               │    │
└───────┬───────┘      └───────┬───────┘    │
        │                      │            │
        ▼                      │            │
┌─────────────────┐            │            │
│  onPageShow()   │  ← 重新显示│            │
└─────────────────┘            │            │
                               │            │
                               ▼            ▼
                   ┌──────────────────────────┐
                   │   aboutToDisappear()     │  ← 组件即将消失
                   │                          │     清理资源
                   │   • 取消网络请求         │
                   │   • 释放资源             │
                   └──────────────────────────┘
```

### 4.3 关键跳转关系

```
Page生命周期的跳转规则:
═══════════════════════════════════════════════════════════════════

正常显示流程:
─────────────────────────────────────────────────────────────────
aboutToAppear() → onPageShow()


页面切换循环 (可多次):
─────────────────────────────────────────────────────────────────
                    ┌──────────────────────┐
                    │                      │
                    ▼                      │
              onPageShow() ────────► onPageHide()
                    ▲                      │
                    │                      │
                    └──────────────────────┘

跳转到其他页面 → onPageHide()
返回此页面 → onPageShow()


销毁流程:
─────────────────────────────────────────────────────────────────
onPageHide() → aboutToDisappear()
```

---

## 五、子组件(@Component) vs Fragment

### 5.1 鸿蒙有Fragment吗？

**鸿蒙没有Fragment这个概念**，但有类似的机制：**@Component子组件**。

```
对比:
═══════════════════════════════════════════════════════════════════

Android Fragment:
─────────────────────────────────────────────────────────────────
• 有独立的生命周期 (onAttach, onCreate, onCreateView...)
• 可以动态添加/移除
• 有自己的回退栈
• 嵌套在Activity中

鸿蒙 @Component 子组件:
─────────────────────────────────────────────────────────────────
• 有简化的生命周期 (aboutToAppear, aboutToDisappear)
• 可以动态添加/移除 (通过条件渲染)
• 没有独立的回退栈
• 嵌套在父组件中
• 生命周期跟随父组件
```

### 5.2 子组件示例

```typescript
// 父组件 (Page)
@Entry
@Component
struct ParentPage {
    @State showChild: boolean = true;
    
    aboutToAppear() {
        console.log('父组件 aboutToAppear');
    }
    
    build() {
        Column() {
            if (this.showChild) {
                ChildComponent()  // ← 子组件
            }
            Button('切换').onClick(() => {
                this.showChild = !this.showChild;
            })
        }
    }
}

// 子组件 (类似Fragment)
@Component
struct ChildComponent {
    
    aboutToAppear() {
        console.log('子组件 aboutToAppear');
        // 子组件初始化
    }
    
    aboutToDisappear() {
        console.log('子组件 aboutToDisappear');
        // 子组件销毁
    }
    
    build() {
        Text('我是子组件')
    }
}
```

### 5.3 子组件生命周期特点

```
子组件生命周期特点:
═══════════════════════════════════════════════════════════════════

1. 生命周期方法较少:
   • aboutToAppear() - 即将出现
   • aboutToDisappear() - 即将消失
   • aboutToReuse() - 即将复用 (列表场景)
   • aboutToRecycle() - 即将回收 (列表场景)

2. 没有 onPageShow/onPageHide:
   • 只有 @Entry 标记的页面组件才有这两个方法
   • 普通 @Component 子组件没有

3. 生命周期跟随父组件:
   • 父组件销毁 → 子组件也销毁
   • 父组件隐藏 → 子组件也隐藏 (但不会调用aboutToDisappear)

4. 条件渲染控制生命周期:
   • if (condition) { ChildComponent() }
   • condition变为false → 子组件 aboutToDisappear()
   • condition变为true → 子组件 aboutToAppear()
```

---

## 六、完整的生命周期执行顺序

### 6.1 应用启动时的完整流程

```
应用启动时的执行顺序:
═══════════════════════════════════════════════════════════════════

时间线 ──────────────────────────────────────────────────────────►

[T1] UIAbility.onCreate()
     │
     │  初始化应用数据
     │
     ▼
[T2] UIAbility.onWindowStageCreate()
     │
     │  windowStage.loadContent('pages/Index')
     │  ↓ 触发页面加载
     │
     ▼
[T3] IndexPage.aboutToAppear()    ← 页面组件创建
     │
     │  初始化页面数据
     │
     ▼
[T4] ChildComponent.aboutToAppear()   ← 子组件创建 (如果有)
     │
     │  初始化子组件数据
     │
     ▼
[T5] UIAbility.onForeground()
     │
     │  应用进入前台
     │
     ▼
[T6] IndexPage.onPageShow()       ← 页面显示
     │
     │  开始动画、刷新UI
     │
     ▼
[T7] ★ 应用运行中，等待用户交互 ★
```

### 6.2 应用退出时的完整流程

```
应用退出时的执行顺序:
═══════════════════════════════════════════════════════════════════

时间线 ──────────────────────────────────────────────────────────►

[T1] IndexPage.onPageHide()       ← 页面隐藏
     │
     │  暂停动画
     │
     ▼
[T2] UIAbility.onBackground()
     │
     │  应用进入后台
     │
     ▼
[T3] ChildComponent.aboutToDisappear()  ← 子组件销毁 (如果有)
     │
     │  清理子组件资源
     │
     ▼
[T4] IndexPage.aboutToDisappear()  ← 页面组件销毁
     │
     │  清理页面资源
     │
     ▼
[T5] UIAbility.onWindowStageDestroy()
     │
     │  释放窗口资源
     │
     ▼
[T6] UIAbility.onDestroy()
     │
     │  释放所有资源
     │
     ▼
[T7] ★ 应用完全退出 ★
```

---

## 七、DummyMain如何构建？

### 7.1 为什么需要DummyMain？

```
问题:
═══════════════════════════════════════════════════════════════════

鸿蒙应用没有传统的 main() 函数!

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  传统程序:                                                       │
│  ─────────                                                       │
│  function main() {           ← 有明确的入口点                   │
│      let app = new App();                                        │
│      app.run();                                                  │
│  }                                                               │
│                                                                  │
│  鸿蒙应用:                                                       │
│  ─────────                                                       │
│  class EntryAbility extends UIAbility {                         │
│      onCreate() { ... }      ← 没有main()                       │
│      onForeground() { ... }  ← 这些方法由系统调用                │
│  }                                                               │
│                                                                  │
│  @Entry @Component                                               │
│  struct IndexPage {                                              │
│      aboutToAppear() { ... } ← 也是由系统调用                   │
│  }                                                               │
│                                                                  │
│  ❌ 静态分析器不知道从哪里开始分析!                              │
│  ❌ 不知道这些方法的调用顺序!                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

解决方案: 生成一个虚拟的 DummyMain 函数
```

### 7.2 DummyMain的结构

根据ArkAnalyzer中`DummyMainCreater.ts`的实现，DummyMain的结构如下：

```typescript
// 生成的DummyMain伪代码
function @dummyMain() {
    
    // ═══════════════════════════════════════════════════════════
    // 第1步: 调用所有静态初始化方法
    // ═══════════════════════════════════════════════════════════
    StaticClass1.%statInit();
    StaticClass2.%statInit();
    // ...
    
    // ═══════════════════════════════════════════════════════════
    // 第2步: 创建所有需要的实例
    // ═══════════════════════════════════════════════════════════
    let ability = new EntryAbility();
    ability.constructor();
    
    let page = new IndexPage();
    page.constructor();
    
    // ═══════════════════════════════════════════════════════════
    // 第3步: 主循环 - 模拟系统调度
    // ═══════════════════════════════════════════════════════════
    let count = 0;
    while (true) {
        
        // 生命周期方法调用
        if (count === 1) {
            ability.onCreate(want);
        }
        if (count === 2) {
            ability.onWindowStageCreate(windowStage);
        }
        if (count === 3) {
            page.aboutToAppear();
        }
        if (count === 4) {
            ability.onForeground();
        }
        if (count === 5) {
            page.onPageShow();
        }
        
        // 回调方法调用
        if (count === 6) {
            page.onClick();  // 用户点击
        }
        if (count === 7) {
            page.onTouch();  // 用户触摸
        }
        
        // 更多生命周期...
        if (count === 8) {
            page.onPageHide();
        }
        if (count === 9) {
            ability.onBackground();
        }
        if (count === 10) {
            page.aboutToDisappear();
        }
        if (count === 11) {
            ability.onDestroy();
        }
        
        // count可以是任意值，这样所有分支都可能被执行
    }
    
    return;
}
```

### 7.3 DummyMain的控制流图

```
DummyMain的CFG结构:
═══════════════════════════════════════════════════════════════════

                    ┌─────────────────────┐
                    │      [Entry]        │
                    │                     │
                    │  静态初始化调用     │
                    │  实例创建           │
                    │  count = 0          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   [While Loop]      │◄─────────────────────┐
                    │   while(true)       │                      │
                    └──────────┬──────────┘                      │
                               │                                  │
           ┌───────────────────┼───────────────────┐             │
           │                   │                   │             │
           ▼                   ▼                   ▼             │
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
    │ if(count=1) │     │ if(count=2) │     │ if(count=3) │     │
    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     │
           │                   │                   │             │
           ▼                   ▼                   ▼             │
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
    │ onCreate()  │     │ onWindow    │     │ aboutTo     │     │
    │             │     │ StageCreate │     │ Appear()    │     │
    └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     │
           │                   │                   │             │
           └───────────────────┴───────────────────┘             │
                               │                                  │
                               │ ... 更多分支 ...                │
                               │                                  │
                               └──────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     [Return]        │
                    └─────────────────────┘
```

### 7.4 ArkAnalyzer现有DummyMain的局限性

```
当前实现的问题:
═══════════════════════════════════════════════════════════════════

ArkAnalyzer的DummyMainCreater.ts 当前实现:

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  while (true) {                                                  │
│      if (count === 1) onCreate()                                │
│      if (count === 2) onWindowStageCreate()                     │
│      if (count === 3) aboutToAppear()                           │
│      ...                                                         │
│  }                                                               │
│                                                                  │
│  问题:                                                           │
│  ────                                                            │
│  ❌ 没有建模生命周期的顺序关系                                   │
│     (onCreate一定在onForeground之前)                            │
│                                                                  │
│  ❌ 没有建模状态转换                                             │
│     (onForeground ↔ onBackground 可以循环)                      │
│                                                                  │
│  ❌ 没有建模回调的位置                                           │
│     (onClick只能在onPageShow之后发生)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

需要改进为 (参考FlowDroid):
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  // 按顺序调用生命周期                                           │
│  ability.onCreate()                                              │
│  ability.onWindowStageCreate()                                   │
│  page.aboutToAppear()                                            │
│  ability.onForeground()                                          │
│  page.onPageShow()                                               │
│                                                                  │
│  // 回调循环                                                     │
│  while (nondet()) {                                              │
│      if (nondet()) page.onClick()                               │
│      if (nondet()) page.onTouch()                               │
│  }                                                               │
│                                                                  │
│  // 可能回到前台                                                 │
│  if (nondet()) goto onForeground                                │
│                                                                  │
│  // 销毁流程                                                     │
│  page.onPageHide()                                               │
│  ability.onBackground()                                          │
│  page.aboutToDisappear()                                         │
│  ability.onDestroy()                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 八、总结：需要实现的生命周期建模

### 8.1 UIAbility生命周期常量

```typescript
// 需要定义的UIAbility生命周期方法
const UIABILITY_LIFECYCLE = {
    ONCREATE: "onCreate",
    ONWINDOWSTAGECREATE: "onWindowStageCreate", 
    ONFOREGROUND: "onForeground",
    ONBACKGROUND: "onBackground",
    ONWINDOWSTAGEDESTROY: "onWindowStageDestroy",
    ONDESTROY: "onDestroy",
    
    // 可选的生命周期
    ONNEWWANT: "onNewWant",
    ONCONTINUE: "onContinue",
    ONSAVESTATE: "onSaveState",
};
```

### 8.2 Page/Component生命周期常量

```typescript
// 需要定义的Page/Component生命周期方法
const COMPONENT_LIFECYCLE = {
    // 所有@Component都有
    ABOUTTOAPPEAR: "aboutToAppear",
    ABOUTTODISAPPEAR: "aboutToDisappear",
    BUILD: "build",
    
    // 仅@Entry页面有
    ONPAGESHOW: "onPageShow",
    ONPAGEHIDE: "onPageHide",
    ONBACKPRESS: "onBackPress",
    
    // 列表复用场景
    ABOUTTOREUSE: "aboutToReuse",
    ABOUTTORECYCLE: "aboutToRecycle",
};
```

### 8.3 回调方法常量

```typescript
// 需要定义的回调方法
const CALLBACK_METHODS = {
    ONCLICK: "onClick",
    ONTOUCH: "onTouch",
    ONAPPEAR: "onAppear",
    ONDISAPPEAR: "onDisAppear",
    ONFOCUS: "onFocus",
    ONBLUR: "onBlur",
    ONHOVER: "onHover",
    ONDRAGSTART: "onDragStart",
    ONDROP: "onDrop",
    // ...
};
```

### 8.4 理想的DummyMain生成流程

```
理想的DummyMain生成:
═══════════════════════════════════════════════════════════════════

function dummyMain() {
    // ═══════════════════════════════════════════════════════════
    // UIAbility层
    // ═══════════════════════════════════════════════════════════
    let ability = new EntryAbility();
    
    ability.onCreate(want);
    ability.onWindowStageCreate(windowStage);  // 这里会loadContent
    
    // ═══════════════════════════════════════════════════════════
    // Page/Component层
    // ═══════════════════════════════════════════════════════════
    let page = new IndexPage();
    
    page.aboutToAppear();
    
    // ═══════════════════════════════════════════════════════════
    // 前后台循环
    // ═══════════════════════════════════════════════════════════
foregroundLabel:
    ability.onForeground();
    page.onPageShow();
    
    // 回调循环
    while (nondet()) {
        if (nondet()) page.onClick(event);
        if (nondet()) page.onTouch(event);
        if (nondet()) page.onScroll(offset);
        // ... 更多回调
    }
    
    page.onPageHide();
    ability.onBackground();
    
    if (nondet()) goto foregroundLabel;  // 可能回到前台
    
    // ═══════════════════════════════════════════════════════════
    // 销毁流程
    // ═══════════════════════════════════════════════════════════
    page.aboutToDisappear();
    ability.onWindowStageDestroy();
    ability.onDestroy();
}
```

---

这份文档应该能帮助你理解鸿蒙系统的生命周期机制，以及如何构建DummyMain函数！如果有任何不清楚的地方，请告诉我。
