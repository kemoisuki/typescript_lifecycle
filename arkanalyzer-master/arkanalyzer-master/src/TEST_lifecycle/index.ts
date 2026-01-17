/*
 * Copyright (c) 2024-2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @file index.ts
 * @description TEST_lifecycle 模块入口
 * 
 * 本模块提供扩展版的生命周期建模功能，用于构建包含多 Ability 和精细化
 * UI 回调的 DummyMain 函数。
 * 
 * ## 模块结构
 * 
 * ```
 * TEST_lifecycle/
 * ├── index.ts                      # 模块入口（本文件）
 * ├── LifecycleTypes.ts             # 类型定义
 * ├── AbilityCollector.ts           # Ability/Component 收集器
 * ├── ViewTreeCallbackExtractor.ts  # UI 回调提取器
 * └── LifecycleModelCreator.ts      # 核心：扩展版 DummyMain 创建器
 * ```
 * 
 * ## 快速使用
 * 
 * ```typescript
 * import { LifecycleModelCreator } from './TEST_lifecycle';
 * 
 * // 假设 scene 已经构建完成
 * const creator = new LifecycleModelCreator(scene);
 * creator.create();
 * 
 * // 获取生成的 DummyMain
 * const dummyMain = creator.getDummyMain();
 * ```
 * 
 * ## 与原 DummyMainCreater 的区别
 * 
 * | 功能 | DummyMainCreater | LifecycleModelCreator |
 * |------|------------------|----------------------|
 * | 多 Ability | ❌ 单个 Scene | ✅ 所有 Ability |
 * | 页面跳转 | ❌ | ✅ (TODO) |
 * | UI 回调 | 粗糙收集 | ✅ ViewTree 精细化 |
 * | 控件实例化 | ❌ | ✅ (TODO) |
 */

// ============================================================================
// 导出类型定义
// ============================================================================

export {
    // 生命周期阶段枚举
    AbilityLifecycleStage,
    ComponentLifecycleStage,
    
    // 信息接口
    AbilityInfo,
    ComponentInfo,
    UICallbackInfo,
    
    // 导航相关
    AbilityNavigationTarget,
    NavigationType,
    
    // 事件类型
    UIEventType,
    
    // 配置
    LifecycleModelConfig,
    DEFAULT_LIFECYCLE_CONFIG,
} from './LifecycleTypes';

// ============================================================================
// 导出核心类
// ============================================================================

export { AbilityCollector } from './AbilityCollector';
export { ViewTreeCallbackExtractor, extractUICallbacks } from './ViewTreeCallbackExtractor';
export { LifecycleModelCreator } from './LifecycleModelCreator';
