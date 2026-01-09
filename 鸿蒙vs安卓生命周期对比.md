# 鸿蒙 vs 安卓 生命周期对比

## 一、整体架构对比

### 1.1 应用结构对比图

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│         安卓应用结构                              鸿蒙应用结构（Stage模型）              │
│         ════════════                              ══════════════════════                 │
│                                                                                          │
│    ┌─────────────────────┐                   ┌─────────────────────┐                    │
│    │    Application      │                   │   AbilityStage      │ ← 新增！          │
│    │    (应用)           │                   │   (能力舞台)        │   应用级容器       │
│    └──────────┬──────────┘                   └──────────┬──────────┘                    │
│               │                                         │                               │
│    ┌──────────┴──────────┐                   ┌──────────┴──────────┐                    │
│    │                     │                   │                     │                    │
│    ▼                     ▼                   ▼                     ▼                    │
│ ┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐                 │
│ │Activity│          │Service │          │UIAbility│         │UIAbility│                │
│ │ (界面) │          │ (服务) │          │ (能力) │          │ (能力) │                 │
│ └───┬────┘          └────────┘          └───┬────┘          └────────┘                 │
│     │                                       │                                           │
│     │ 包含                                  │ 包含                                      │
│     ▼                                       ▼                                           │
│ ┌────────┐                             ┌─────────┐                                     │
│ │Fragment│                             │WindowStage│                                   │
│ │ (片段) │                             │  (窗口)  │                                    │
│ └───┬────┘                             └────┬────┘                                     │
│     │                                       │                                           │
│     │ 包含                                  │ 加载                                      │
│     ▼                                       ▼                                           │
│ ┌────────┐                             ┌─────────┐                                     │
│ │  View  │                             │  Page   │  ← @Entry @Component               │
│ │ (视图) │                             │ (页面)  │                                     │
│ └────────┘                             └────┬────┘                                     │
│                                             │                                           │
│                                             │ 包含                                      │
│                                             ▼                                           │
│                                        ┌─────────┐                                     │
│                                        │Component│  ← @Component 子组件               │
│                                        │ (组件)  │                                     │
│                                        └─────────┘                                     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念对照表

| 安卓 | 鸿蒙 | 作用 |
|:----:|:----:|:-----|
| Application | AbilityStage | 应用级容器，管理所有能力 |
| Activity | UIAbility | 应用的基本功能单元，一个"屏幕" |
| Service | ServiceExtensionAbility | 后台服务 |
| Fragment | @Component子组件 | 可复用的界面片段 |
| View | ArkUI组件 | 最基本的界面元素（按钮、文字等）|
| Intent | Want | 组件之间传递消息和数据 |
| Bundle | LaunchParam | 启动时携带的参数 |

---

## 二、鸿蒙的组件类型（重要！）

### 2.1 为什么要了解所有组件类型？

**关键理解**：鸿蒙有多种组件类型，每种都有独立的生命周期，需要**分别建模**，不能混在一起。

这就像：
- 厨师有厨师的工作流程
- 服务员有服务员的工作流程
- 不能把他们的工作流程混在一起写成一个

### 2.2 鸿蒙组件类型全览

```
鸿蒙组件类型全览:
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                        Stage模型（新版）                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. AbilityStage（应用级）                                       │
│     ├── 作用：整个应用的容器，管理所有UIAbility                 │
│     ├── 数量：每个应用只有一个                                   │
│     ├── 类比：安卓的Application                                  │
│     └── 生命周期：onCreate → onAcceptWant → onMemoryLevel       │
│                                                                  │
│  2. UIAbility（能力级）                                          │
│     ├── 作用：应用的功能单元，管理一个窗口                      │
│     ├── 数量：一个应用可以有多个                                 │
│     ├── 类比：安卓的Activity                                     │
│     └── 生命周期：onCreate → onWindowStageCreate → onForeground │
│                   → onBackground → onWindowStageDestroy → onDestroy│
│                                                                  │
│  3. @Entry @Component（页面级）                                  │
│     ├── 作用：入口页面，由UIAbility加载                         │
│     ├── 特点：有onPageShow/onPageHide                           │
│     └── 生命周期：aboutToAppear → onPageShow → onPageHide       │
│                   → aboutToDisappear                             │
│                                                                  │
│  4. @Component（组件级）                                         │
│     ├── 作用：可复用的UI片段                                    │
│     ├── 特点：没有onPageShow/onPageHide                         │
│     └── 生命周期：aboutToAppear → aboutToDisappear              │
│                                                                  │
│  5. ExtensionAbility（扩展能力）                                 │
│     ├── FormExtensionAbility - 桌面卡片                         │
│     ├── ServiceExtensionAbility - 后台服务                      │
│     ├── WorkSchedulerExtensionAbility - 定时任务                │
│     └── 每种都有独立的生命周期                                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        FA模型（旧版）                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  6. PageAbility（旧版页面能力）                                  │
│     ├── 作用：旧版的页面功能单元                                │
│     ├── 类比：安卓的Activity                                     │
│     └── 生命周期：onStart → onActive → onInactive → onBackground│
│                   → onStop → onDestroy                          │
│                                                                  │
│  7. ServiceAbility（旧版服务能力）                               │
│     ├── 作用：旧版的后台服务                                    │
│     ├── 类比：安卓的Service                                      │
│     └── 生命周期：onStart → onCommand → onStop                  │
│                                                                  │
│  8. DataAbility（旧版数据能力）                                  │
│     ├── 作用：数据共享                                          │
│     ├── 类比：安卓的ContentProvider                              │
│     └── 生命周期：onStart → 数据操作方法 → onStop               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 各组件的用途详解

```
组件用途说明（通俗版）:
═══════════════════════════════════════════════════════════════════

1. AbilityStage - "应用管家"
   ─────────────────────────────────────────────────────────────
   想象你开了一家公司：
   • AbilityStage就是公司的总经理
   • 负责管理公司里所有的部门（UIAbility）
   • 公司只有一个总经理
   • 当有新任务来时，决定交给哪个部门处理
   
   
2. UIAbility - "部门"
   ─────────────────────────────────────────────────────────────
   继续上面的比喻：
   • UIAbility就是公司的一个部门
   • 每个部门有自己的办公室（窗口）
   • 部门可以开门营业（前台）或关门休息（后台）
   • 一个公司可以有多个部门
   
   
3. @Entry @Component - "部门的前台大厅"
   ─────────────────────────────────────────────────────────────
   • 这是部门的主要工作区域
   • 客户（用户）在这里办理业务
   • 有"开门"和"关门"的概念（onPageShow/onPageHide）
   
   
4. @Component - "办公桌/工位"
   ─────────────────────────────────────────────────────────────
   • 这是具体的工作单元
   • 可以复用（同样的工位可以放在不同地方）
   • 生命周期简单：摆上去、撤掉
   
   
5. ExtensionAbility - "外包服务"
   ─────────────────────────────────────────────────────────────
   • 提供特定的扩展功能
   • 比如：桌面小卡片、后台定时任务等
   • 每种外包服务有自己的工作流程
```

---

## 三、生命周期层次对比

### 3.1 安卓：单层生命周期

安卓的Activity有一套完整的生命周期，Fragment嵌套在Activity中，有自己独立的生命周期。

```
安卓生命周期层次:
═══════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────┐
                    │         Activity层               │
                    │                                  │
                    │  onCreate → onStart → onResume  │
                    │       ↑                    ↓     │
                    │       └── onRestart ←── onPause │
                    │                            ↓     │
                    │                         onStop   │
                    │                            ↓     │
                    │                        onDestroy │
                    │                                  │
                    │  ┌────────────────────────────┐ │
                    │  │      Fragment层（嵌套）     │ │
                    │  │                            │ │
                    │  │  onAttach → onCreate →     │ │
                    │  │  onCreateView → onResume   │ │
                    │  │  → onPause → onDestroyView │ │
                    │  │  → onDestroy → onDetach    │ │
                    │  │                            │ │
                    │  └────────────────────────────┘ │
                    └─────────────────────────────────┘

特点：
• Activity有8-10个生命周期方法
• Fragment有12个生命周期方法
• Fragment的生命周期与Activity紧密关联
• 复杂度较高
```

### 3.2 鸿蒙：多层生命周期

鸿蒙把生命周期分成了多层，每层各司其职。

```
鸿蒙生命周期层次:
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                     AbilityStage层                               │
│                   （应用级，最顶层）                              │
│                                                                  │
│     onCreate → onAcceptWant → onConfigurationUpdate             │
│                                                                  │
│     职责：应用初始化、决定启动哪个UIAbility                      │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ 管理
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UIAbility层                                 │
│                    （能力级）                                     │
│                                                                  │
│     onCreate → onWindowStageCreate → onForeground               │
│                                           ↑    ↓                 │
│                                           └────┘                 │
│                                        (前后台切换)              │
│     onBackground → onWindowStageDestroy → onDestroy             │
│                                                                  │
│     职责：管理窗口、处理前后台切换                               │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ 加载页面
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   @Entry @Component层                            │
│                   （页面级）                                      │
│                                                                  │
│              aboutToAppear → onPageShow                         │
│                                  ↑    ↓                          │
│                                  └────┘                          │
│                              (页面切换)                           │
│              onPageHide → aboutToDisappear                      │
│                                                                  │
│     职责：页面显示/隐藏、用户交互                                │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ 包含
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @Component层                                  │
│                   （组件级）                                      │
│                                                                  │
│              aboutToAppear → aboutToDisappear                   │
│                                                                  │
│     职责：组件的创建和销毁                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、DummyMain构建策略对比

### 4.1 FlowDroid的策略：分别为每种组件生成DummyMain

```
FlowDroid的做法（正确示范）:
═══════════════════════════════════════════════════════════════════

FlowDroid会遍历应用中的每个类，判断类型，然后分别生成DummyMain：

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  遍历应用中的所有类:                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class MainActivity extends Activity                │   │
│  │ 判断: 这是一个Activity                                    │   │
│  │ 动作: 使用 ActivityEntryPointCreator                     │   │
│  │ 生成: dummyMain_MainActivity()                           │   │
│  │       {                                                   │   │
│  │           activity.onCreate()                             │   │
│  │           activity.onStart()                              │   │
│  │           activity.onResume()                             │   │
│  │           // 回调循环                                      │   │
│  │           activity.onPause()                              │   │
│  │           activity.onDestroy()                            │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class MyService extends Service                    │   │
│  │ 判断: 这是一个Service                                     │   │
│  │ 动作: 使用 ServiceEntryPointCreator                      │   │
│  │ 生成: dummyMain_MyService()                              │   │
│  │       {                                                   │   │
│  │           service.onCreate()                              │   │
│  │           service.onStartCommand()  // 可多次调用        │   │
│  │           service.onBind()                                │   │
│  │           service.onDestroy()                             │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class MyReceiver extends BroadcastReceiver         │   │
│  │ 判断: 这是一个BroadcastReceiver                           │   │
│  │ 动作: 使用 BroadcastReceiverEntryPointCreator            │   │
│  │ 生成: dummyMain_MyReceiver()                             │   │
│  │       {                                                   │   │
│  │           receiver.onReceive()                            │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  关键点：每种组件类型有专门的Creator，生成独立的DummyMain        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 鸿蒙应该采用的策略：同样分别生成

```
鸿蒙的正确做法:
═══════════════════════════════════════════════════════════════════

同样遍历应用中的每个类，判断类型，分别生成DummyMain：

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  遍历应用中的所有类:                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class MyAbilityStage extends AbilityStage          │   │
│  │ 判断: 这是一个AbilityStage                                │   │
│  │ 动作: 使用 AbilityStageEntryPointCreator                 │   │
│  │ 生成: dummyMain_MyAbilityStage()                         │   │
│  │       {                                                   │   │
│  │           stage.onCreate()                                │   │
│  │           stage.onAcceptWant()                            │   │
│  │           stage.onConfigurationUpdate()                   │   │
│  │           stage.onMemoryLevel()                           │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class EntryAbility extends UIAbility               │   │
│  │ 判断: 这是一个UIAbility                                   │   │
│  │ 动作: 使用 UIAbilityEntryPointCreator                    │   │
│  │ 生成: dummyMain_EntryAbility()                           │   │
│  │       {                                                   │   │
│  │           ability.onCreate()                              │   │
│  │           ability.onWindowStageCreate()                   │   │
│  │           // 这里会关联到对应的Page                       │   │
│  │           ability.onForeground()                          │   │
│  │           ability.onBackground()                          │   │
│  │           ability.onWindowStageDestroy()                  │   │
│  │           ability.onDestroy()                             │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: @Entry @Component struct IndexPage                 │   │
│  │ 判断: 这是一个入口页面组件                                │   │
│  │ 动作: 使用 PageEntryPointCreator                         │   │
│  │ 生成: dummyMain_IndexPage()                              │   │
│  │       {                                                   │   │
│  │           page.aboutToAppear()                            │   │
│  │           page.onPageShow()                               │   │
│  │           // 回调循环                                      │   │
│  │           page.onPageHide()                               │   │
│  │           page.aboutToDisappear()                         │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: @Component struct ChildComponent                   │   │
│  │ 判断: 这是一个普通组件（非入口）                          │   │
│  │ 动作: 使用 ComponentEntryPointCreator                    │   │
│  │ 生成: dummyMain_ChildComponent()                         │   │
│  │       {                                                   │   │
│  │           component.aboutToAppear()                       │   │
│  │           // 回调循环（没有onPageShow/Hide）              │   │
│  │           component.aboutToDisappear()                    │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class MyFormAbility extends FormExtensionAbility   │   │
│  │ 判断: 这是一个卡片扩展能力                                │   │
│  │ 动作: 使用 FormExtensionEntryPointCreator                │   │
│  │ 生成: dummyMain_MyFormAbility()                          │   │
│  │       {                                                   │   │
│  │           form.onAddForm()                                │   │
│  │           form.onUpdateForm()                             │   │
│  │           form.onRemoveForm()                             │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  如果需要支持FA模型（旧版）:                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 发现: class OldAbility extends PageAbility               │   │
│  │ 判断: 这是一个FA模型的PageAbility                         │   │
│  │ 动作: 使用 PageAbilityEntryPointCreator (FA)             │   │
│  │ 生成: dummyMain_OldAbility()                             │   │
│  │       {                                                   │   │
│  │           ability.onStart()                               │   │
│  │           ability.onActive()                              │   │
│  │           ability.onInactive()                            │   │
│  │           ability.onBackground()                          │   │
│  │           ability.onStop()                                │   │
│  │       }                                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 为什么不能把所有组件揉在一起？

```
错误做法 vs 正确做法:
═══════════════════════════════════════════════════════════════════

❌ 错误做法：把所有组件揉在一个DummyMain里
─────────────────────────────────────────────────────────────────

dummyMain() {
    // 所有东西混在一起
    abilityStage.onCreate()
    ability1.onCreate()
    ability2.onCreate()        // ← 哪个先？关系是什么？
    page1.aboutToAppear()
    page2.aboutToAppear()      // ← page1和page2分别属于哪个ability？
    component1.aboutToAppear()
    ...
}

问题：
• 组件之间的从属关系丢失了
• 无法正确分析数据在组件间的流动
• 生命周期顺序混乱


✅ 正确做法：每种组件类型分别生成DummyMain
─────────────────────────────────────────────────────────────────

// AbilityStage的DummyMain
dummyMain_MyAbilityStage() {
    stage.onCreate()
    stage.onAcceptWant()
}

// UIAbility的DummyMain（可能有多个）
dummyMain_EntryAbility() {
    ability.onCreate()
    ability.onWindowStageCreate()
    // 这里可以关联到它加载的Page
    ability.onForeground()
    ability.onBackground()
    ability.onDestroy()
}

dummyMain_SettingsAbility() {
    ability.onCreate()
    ability.onWindowStageCreate()
    ability.onForeground()
    ...
}

// Page的DummyMain（可能有多个）
dummyMain_IndexPage() {
    page.aboutToAppear()
    page.onPageShow()
    // 回调
    page.onPageHide()
    page.aboutToDisappear()
}

优点：
• 每种组件的生命周期清晰
• 可以分别分析每个组件
• 然后再分析组件之间的调用关系
```

---

## 五、需要支持的组件类型清单

### 5.1 Stage模型（主要）

| 组件类型 | 基类 | 需要的EntryPointCreator |
|:--------:|:----:|:-----------------------:|
| 应用级 | AbilityStage | AbilityStageEntryPointCreator |
| 能力级 | UIAbility | UIAbilityEntryPointCreator |
| 页面级 | @Entry @Component | PageEntryPointCreator |
| 组件级 | @Component | ComponentEntryPointCreator |
| 卡片 | FormExtensionAbility | FormExtensionEntryPointCreator |
| 后台服务 | ServiceExtensionAbility | ServiceExtensionEntryPointCreator |

### 5.2 FA模型（兼容旧版）

| 组件类型 | 基类 | 需要的EntryPointCreator |
|:--------:|:----:|:-----------------------:|
| 页面能力 | PageAbility | PageAbilityEntryPointCreator |
| 服务能力 | ServiceAbility | ServiceAbilityEntryPointCreator |
| 数据能力 | DataAbility | DataAbilityEntryPointCreator |

### 5.3 组件识别方法

```
如何识别组件类型:
═══════════════════════════════════════════════════════════════════

1. AbilityStage
   判断条件: class XXX extends AbilityStage
   
2. UIAbility
   判断条件: class XXX extends UIAbility
   
3. @Entry @Component (入口页面)
   判断条件: 同时有 @Entry 和 @Component 装饰器
   
4. @Component (普通组件)
   判断条件: 只有 @Component 装饰器，没有 @Entry
   
5. FormExtensionAbility
   判断条件: class XXX extends FormExtensionAbility
   
6. PageAbility (FA模型)
   判断条件: class XXX extends PageAbility
   
7. ServiceAbility (FA模型)
   判断条件: class XXX extends ServiceAbility
```

---

## 六、生命周期流程详细对比

### 6.1 安卓Activity生命周期流程

```
                              ┌─────────────┐
                              │   用户启动   │
                              │    应用      │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  onCreate   │ ← 创建界面
                              │  创建阶段   │   初始化数据
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  onStart    │ ← 界面即将可见
                              │  启动阶段   │   但还不能交互
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  onResume   │ ← 界面可见且可交互
                              │  运行阶段   │   用户可以操作了
                              └──────┬──────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          │   ★ 应用运行中 ★    │
                          │   用户正在使用      │
                          │                     │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
             ┌───────────┐    ┌───────────┐    ┌───────────┐
             │ 打开新界面 │    │ 按Home键  │    │ 关闭应用  │
             └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
                   │                │                │
                   ▼                ▼                │
             ┌─────────────┐  ┌─────────────┐       │
             │  onPause    │  │  onPause    │       │
             └─────┬───────┘  └──────┬──────┘       │
                   │                 │              │
                   │                 ▼              │
                   │          ┌─────────────┐       │
                   │          │  onStop     │       │
                   │          └──────┬──────┘       │
                   │                 │              │
                   │     ┌───────────┴───────────┐  │
                   │     │                       │  │
                   │     ▼                       ▼  ▼
                   │ ┌─────────────┐      ┌─────────────┐
                   │ │ onRestart   │      │  onDestroy  │
                   │ └──────┬──────┘      └─────────────┘
                   │        │
                   │        │ 返回到onStart
                   │        ▼
                   │    ┌─────────────┐
                   └───►│  onResume   │
                        └─────────────┘
```

### 6.2 鸿蒙各组件生命周期流程

#### AbilityStage生命周期

```
                    ┌─────────────────┐
                    │   应用启动       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    onCreate     │ ← 应用级初始化
                    │   应用创建      │   只调用一次
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  onAcceptWant   │ ← 决定启动哪个UIAbility
                    │  接受请求       │   可多次调用
                    └────────┬────────┘
                             │
                             │ (应用运行中...)
                             │
                             ▼
                    ┌─────────────────┐
                    │ onMemoryLevel   │ ← 内存警告
                    │  内存告警       │   可选处理
                    └─────────────────┘
```

#### UIAbility生命周期

```
                    ┌─────────────────┐
                    │  UIAbility启动  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    onCreate     │ ← 能力创建
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ onWindowStageCreate │ ← 窗口创建
                    │  加载页面           │   loadContent()
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  onForeground   │◄────────┐
                    │   进入前台      │         │
                    └────────┬────────┘         │
                             │                  │
                    ┌────────┴────────┐         │
                    │   应用运行中     │         │
                    └────────┬────────┘         │
                             │                  │
                             ▼                  │
                    ┌─────────────────┐         │
                    │  onBackground   │─────────┘
                    │   进入后台      │  (可能回到前台)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │onWindowStageDestroy │
                    │   窗口销毁          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │   onDestroy     │
                    │   能力销毁      │
                    └─────────────────┘
```

#### @Entry @Component 页面生命周期

```
                    ┌─────────────────┐
                    │   页面加载      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ aboutToAppear   │ ← 页面即将出现
                    │  初始化数据     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  onPageShow     │◄────────┐
                    │   页面显示      │         │
                    └────────┬────────┘         │
                             │                  │
                    ┌────────┴────────┐         │
                    │   用户交互中     │         │
                    │  onClick等回调  │         │
                    └────────┬────────┘         │
                             │                  │
                             ▼                  │
                    ┌─────────────────┐         │
                    │  onPageHide     │─────────┘
                    │   页面隐藏      │  (可能重新显示)
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │aboutToDisappear │
                    │   页面销毁      │
                    └─────────────────┘
```

#### @Component 普通组件生命周期

```
                    ┌─────────────────┐
                    │   组件创建      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ aboutToAppear   │ ← 组件即将出现
                    │  初始化         │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   组件使用中     │
                    │   (无onPageShow) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │aboutToDisappear │ ← 组件即将消失
                    │   清理资源      │
                    └─────────────────┘
                    
注意：普通@Component没有onPageShow/onPageHide！
```

---

## 七、总结

### 7.1 主要差异总结

| 对比项 | 安卓 | 鸿蒙 |
|:------:|:----:|:----:|
| 生命周期层数 | 单层 (Activity内嵌Fragment) | 多层 (AbilityStage → UIAbility → Page → Component) |
| 组件类型数量 | 4种 (Activity, Service, BroadcastReceiver, ContentProvider) | 更多 (AbilityStage, UIAbility, Page, Component, 各种Extension...) |
| 方法数量 | 多 (~19个) | 相对少，但分布在多层 |
| 复杂度 | 中等 | 层次多，但每层简单 |

### 7.2 DummyMain构建的关键原则

```
关键原则:
═══════════════════════════════════════════════════════════════════

1. 分别建模，不要混在一起
   • 每种组件类型有专门的EntryPointCreator
   • 生成独立的DummyMain
   
2. 遍历所有组件
   • 不仅是UIAbility和@Entry @Component
   • 还有AbilityStage、普通@Component、各种ExtensionAbility
   • 如果要兼容旧版，还有FA模型的PageAbility等
   
3. 正确处理组件间关系
   • AbilityStage管理UIAbility
   • UIAbility加载Page
   • Page包含Component
   • 这些关系需要在分析时考虑
   
4. 参考FlowDroid的架构
   • FlowDroid为Activity、Service、BroadcastReceiver、ContentProvider
     分别创建了EntryPointCreator
   • 鸿蒙也应该为每种组件类型创建对应的Creator
```

### 7.3 需要实现的EntryPointCreator清单

```
需要实现的Creator:
═══════════════════════════════════════════════════════════════════

Stage模型（必须）:
├── AbilityStageEntryPointCreator
├── UIAbilityEntryPointCreator
├── PageEntryPointCreator (@Entry @Component)
├── ComponentEntryPointCreator (@Component)
├── FormExtensionEntryPointCreator
└── ServiceExtensionEntryPointCreator

FA模型（可选，兼容旧版）:
├── PageAbilityEntryPointCreator
├── ServiceAbilityEntryPointCreator
└── DataAbilityEntryPointCreator
```

---

这份文档应该能帮助你理解安卓和鸿蒙生命周期的差异，以及正确的DummyMain构建策略！如果有任何问题，请告诉我。
