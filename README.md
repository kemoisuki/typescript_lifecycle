# 🚀 TypeScript Lifecycle - 鸿蒙生命周期建模框架

> **基于 ArkAnalyzer 的扩展版生命周期建模框架**
> 
> 本项目扩展了 ArkAnalyzer 的 `DummyMainCreater`，实现多 Ability 支持和精细化 UI 回调建模。

[![GitHub](https://img.shields.io/badge/GitHub-typescript__lifecycle-blue)](https://github.com/kemoisuki/typescript_lifecycle)

---

## 📦 项目结构

```
typescript/
├── README.md                           # 本文件（项目说明）
├── arkanalyzer-master/                 # ArkAnalyzer 源码
│   └── arkanalyzer-master/
│       └── src/
│           ├── core/                   # 核心模块
│           ├── callgraph/              # 调用图
│           └── TEST_lifecycle/         # ⭐ 新增：生命周期建模扩展
│               ├── README.md           # 详细文档
│               ├── LifecycleTypes.ts
│               ├── AbilityCollector.ts
│               ├── ViewTreeCallbackExtractor.ts
│               ├── LifecycleModelCreator.ts
│               └── index.ts
├── FlowDroid-develop/                  # FlowDroid 参考实现
├── ArkAnalyzer文档.md                  # ArkAnalyzer 学习文档
└── 0109会议纪要.txt                    # 会议记录
```

---

## 🎯 项目目标

本项目旨在扩展 ArkAnalyzer 的 DummyMain 机制，实现：

| 功能 | 原版 | 扩展版 |
|------|:----:|:------:|
| 多 Ability 支持 | ❌ | ✅ |
| 页面跳转建模 | ❌ | 🚧 |
| 精细化 UI 回调 | ❌ | ✅ |
| ViewTree 整合 | ❌ | ✅ |
| 可配置性 | ❌ | ✅ |

---

## 🚀 快速开始

### 使用扩展版 DummyMain

```typescript
import { Scene } from './arkanalyzer-master/arkanalyzer-master/src/Scene';
import { LifecycleModelCreator } from './arkanalyzer-master/arkanalyzer-master/src/TEST_lifecycle';

// 1. 构建 Scene
const scene = new Scene();
scene.buildSceneFromProjectDir('/path/to/harmonyos/project');

// 2. 创建扩展版 DummyMain
const creator = new LifecycleModelCreator(scene);
creator.create();

// 3. 获取结果
const dummyMain = creator.getDummyMain();
const abilities = creator.getAbilities();
const components = creator.getComponents();

// 4. 用于后续分析
const cfg = dummyMain.getCfg();
```

---

## 📖 核心模块说明

### TEST_lifecycle 模块

| 文件 | 功能 |
|------|------|
| `LifecycleTypes.ts` | 类型定义（Ability/Component 信息结构） |
| `AbilityCollector.ts` | 收集所有 Ability 和 Component |
| `ViewTreeCallbackExtractor.ts` | 从 ViewTree 提取 UI 回调 |
| `LifecycleModelCreator.ts` | 核心构建器，生成 DummyMain |
| `index.ts` | 模块入口 |

### 工作流程

```mermaid
flowchart LR
    A[Scene] --> B[收集 Ability]
    A --> C[收集 Component]
    C --> D[提取 ViewTree 回调]
    B --> E[构建 DummyMain CFG]
    C --> E
    D --> E
    E --> F[@extendedDummyMain]
```

---

## 📚 详细文档

👉 **[查看完整文档](arkanalyzer-master/arkanalyzer-master/src/TEST_lifecycle/README.md)**

文档包含：
- 背景与动机
- 核心概念详解（Ability、Component、ViewTree）
- 模块架构图
- 完整流程解析（含图解）
- 类与函数详解
- 使用示例
- TODO 与扩展点
- 常见问题

---

## 🔧 TODO

- [ ] 实现 `analyzeNavigationTargets()` - 页面跳转分析
- [ ] 实现 `checkIsEntryAbility()` - 从 module.json5 读取入口配置
- [ ] 完善 `resolveCallbackMethod()` - 处理匿名函数
- [ ] 实现 `addMethodInvocation()` - 生成方法参数
- [ ] 实现 `addUICallbackInvocation()` - 控件实例化

---

## 👥 贡献者

- **YiZhou** - 项目负责人
- **AI Assistant** - 代码框架与文档

---

## 📅 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-01-17 | v0.1.0 | 初始框架完成，包含基本结构和文档 |

---

## 📄 许可证

本项目基于 Apache License 2.0 许可证。

---

> 如有问题，欢迎提 Issue 或 PR！
