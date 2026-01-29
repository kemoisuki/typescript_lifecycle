# TEST_lifecycle 测试资源与测试结果

## 📊 测试结果总览

```
 Test Files  1 passed (1)
      Tests  17 passed (17)
   Duration  5.92s
```

**最后测试时间**: 2025-01-28

---

## 🗂️ 目录结构

```
lifecycle/
├── simple/                    # 简单项目（基础测试）
│   ├── EntryAbility.ets      # 单个 Ability
│   ├── Index.ets             # 单个 Component（含 onClick）
│   └── module.json5          # 模块配置
│
├── multi-ability/            # 多 Ability 项目
│   ├── EntryAbility.ets      # 入口 Ability（含 startAbility）
│   ├── SecondAbility.ets     # 第二个 Ability
│   └── module.json5          # 多 Ability 配置
│
└── router/                   # 路由测试项目
    ├── Index.ets             # 含多种路由跳转方式
    └── Detail.ets            # 目标页面
```

---

## ✅ 测试用例详情

### Level 1: 单元测试

#### 1.1 AbilityCollector 基础功能

| 测试项 | 状态 | 说明 |
|--------|:----:|------|
| 收集 Ability | ✅ | 收集到 1 个 Ability (EntryAbility) |
| 收集 Component | ✅ | 收集到 1 个 Component (Index) |
| Ability 生命周期方法识别 | ✅ | onCreate, onWindowStageCreate 等 |
| Component 生命周期方法识别 | ✅ | aboutToAppear, build 等 |

#### 1.2 入口 Ability 识别

| 测试项 | 状态 | 说明 |
|--------|:----:|------|
| 识别入口 Ability | ✅ | 正确识别 EntryAbility 为入口 |
| module.json5 配置读取 | ✅ | 读取 mainElement: "EntryAbility" |

#### 1.3 ViewTreeCallbackExtractor

| 测试项 | 状态 | 说明 |
|--------|:----:|------|
| 从 Component 提取回调 | ✅ | 提取到 2 个回调 |
| 解析 onClick 回调 | ✅ | handleClick, %AM0$build |

#### 1.4 NavigationAnalyzer

| 测试项 | 状态 | 说明 |
|--------|:----:|------|
| 分析 router.pushUrl | ✅ | 识别 goToDetail1, goToDetail2, goToSettings |
| 路由 URL 提取 | ✅ | 提取 pages/Index 等 |

### Level 2: 集成测试

| 测试项 | 状态 | 说明 |
|--------|:----:|------|
| 收集器 + 回调提取器集成 | ✅ | Component 回调正确填充 |
| 收集器 + 导航分析器集成 | ✅ | 分析 Ability 间跳转关系 |

### Level 3: 端到端测试

| 测试项 | 状态 | 说明 |
|--------|:----:|------|
| 创建 DummyMain | ✅ | 成功创建扩展版 DummyMain |
| DummyMain 包含 CFG | ✅ | CFG 包含 7 个基本块 |
| 正确数量的 Ability/Component | ✅ | 1 Ability + 1 Component |
| 多 Ability 处理 | ✅ | 成功处理 2 个 Ability |

---

## 🔍 测试输出关键信息

### simple 项目分析结果

```
========== LifecycleModelCreator Summary ==========
Abilities: 1
  - EntryAbility (5 lifecycle methods)
Components: 1
  - Index (2 UI callbacks)
DummyMain: @simple/@extendedDummyFile: @extendedDummyClass.@extendedDummyMain()
===================================================
```

### 类结构解析结果

```
类: EntryAbility
  继承: UIAbility
  方法: onCreate, onWindowStageCreate, onForeground, onBackground, onDestroy

类: Index
  继承: CustomComponent
  方法: constructor, aboutToAppear, aboutToDisappear, handleClick, build
  ViewTree: 存在
```

---

## ⚠️ 已知警告

```
[AbilityCollector] Warning: 无法解析 startAbility 的目标 Ability (startSecondAbility)
```

**原因**: Want 对象的 abilityName 字段提取在某些复杂场景下尚需优化。

**影响**: 不影响核心功能，仅影响跨 Ability 跳转目标的精确识别。

---

## 🚀 运行测试

```bash
# 进入项目目录
cd arkanalyzer-master/arkanalyzer-master

# 安装依赖（首次需要）
npm install

# 运行 lifecycle 测试
npx vitest run tests/unit/lifecycle/ --reporter=verbose
```

---

## 📁 测试资源说明

### simple/ - 基础功能测试
- **EntryAbility.ets**: 包含完整生命周期方法的 Ability
- **Index.ets**: 带 onClick 回调的 Component
- **module.json5**: 定义 mainElement 为 EntryAbility

### multi-ability/ - 多 Ability 测试
- **EntryAbility.ets**: 包含 startAbility 跳转到 SecondAbility
- **SecondAbility.ets**: 第二个 Ability
- **module.json5**: 定义多个 abilities

### router/ - 路由分析测试
- **Index.ets**: 包含多种路由调用方式
  - `router.pushUrl({ url: 'pages/Detail' })` - 直接参数
  - `router.pushUrl(options)` - 变量参数
  - `router.replaceUrl()` - 替换式跳转
  - `router.back()` - 返回
- **Detail.ets**: 路由目标页面
