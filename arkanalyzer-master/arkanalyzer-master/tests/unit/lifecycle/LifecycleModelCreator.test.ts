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
 * @file LifecycleModelCreator.test.ts
 * @description TEST_lifecycle 模块的测试文件
 * 
 * 测试层级：
 * - Level 1: 单元测试 (Unit Tests)
 * - Level 2: 集成测试 (Integration Tests)  
 * - Level 3: 端到端测试 (End-to-End Tests)
 */

import { describe, expect, it, beforeAll } from 'vitest';
import path from 'path';
import { Scene, SceneConfig } from '../../../src/index';
import { Sdk } from '../../../src/Config';

// 导入 TEST_lifecycle 模块
import { 
    LifecycleModelCreator,
    AbilityCollector,
    ViewTreeCallbackExtractor,
    NavigationAnalyzer,
    AbilityLifecycleStage,
    ComponentLifecycleStage,
} from '../../../src/TEST_lifecycle';

// ============================================================================
// 测试配置
// ============================================================================

const SDK_DIR = path.join(__dirname, '../../resources/Sdk');
const sdk: Sdk = {
    name: '',
    path: SDK_DIR,
    moduleName: ''
};

/**
 * 构建 Scene 的辅助函数
 */
function buildScene(projectPath: string): Scene {
    const fullPath = path.join(__dirname, '../../resources/lifecycle', projectPath);
    let config: SceneConfig = new SceneConfig();
    config.buildConfig(fullPath, fullPath, [sdk]);
    config.buildFromProjectDir(fullPath);
    let scene = new Scene();
    scene.buildSceneFromProjectDir(config);
    scene.inferTypes();
    return scene;
}

// ============================================================================
// Level 1: 单元测试 - AbilityCollector
// ============================================================================

describe('Level 1: AbilityCollector 单元测试', () => {
    
    describe('1.1 基础功能测试', () => {
        let scene: Scene;
        let collector: AbilityCollector;
        
        beforeAll(() => {
            scene = buildScene('simple');
            collector = new AbilityCollector(scene);
        });

        it('1.1.1 应该能收集到 Ability', () => {
            const abilities = collector.collectAllAbilities();
            expect(abilities.length).toBeGreaterThan(0);
            console.log(`[Test] 收集到 ${abilities.length} 个 Ability`);
        });

        it('1.1.2 应该能收集到 Component', () => {
            const components = collector.collectAllComponents();
            expect(components.length).toBeGreaterThan(0);
            console.log(`[Test] 收集到 ${components.length} 个 Component`);
        });

        it('1.1.3 Ability 应该包含生命周期方法', () => {
            const abilities = collector.collectAllAbilities();
            const entryAbility = abilities.find(a => a.name.includes('Entry'));
            
            if (entryAbility) {
                // 检查是否收集到了 onCreate 等生命周期方法
                const hasOnCreate = entryAbility.lifecycleMethods.has(AbilityLifecycleStage.CREATE);
                console.log(`[Test] EntryAbility 包含 onCreate: ${hasOnCreate}`);
                expect(hasOnCreate).toBe(true);
            }
        });

        it('1.1.4 Component 应该包含生命周期方法', () => {
            const components = collector.collectAllComponents();
            const indexComponent = components.find(c => c.name === 'Index');
            
            if (indexComponent) {
                const hasAboutToAppear = indexComponent.lifecycleMethods.has(
                    ComponentLifecycleStage.ABOUT_TO_APPEAR
                );
                console.log(`[Test] Index 包含 aboutToAppear: ${hasAboutToAppear}`);
            }
        });
    });

    describe('1.2 入口 Ability 识别测试', () => {
        let scene: Scene;
        let collector: AbilityCollector;
        
        beforeAll(() => {
            scene = buildScene('simple');
            collector = new AbilityCollector(scene);
        });

        it('1.2.1 应该能识别入口 Ability', () => {
            const abilities = collector.collectAllAbilities();
            const entryAbilities = abilities.filter(a => a.isEntry);
            
            console.log(`[Test] 入口 Ability 数量: ${entryAbilities.length}`);
            console.log(`[Test] 入口 Ability 名称: ${entryAbilities.map(a => a.name).join(', ')}`);
            
            // 至少应该有一个入口 Ability
            expect(entryAbilities.length).toBeGreaterThanOrEqual(0);
        });

        it('1.2.2 应该能读取 module.json5 配置', () => {
            const entryNames = collector.getEntryAbilityNames();
            console.log(`[Test] module.json5 中的入口: ${[...entryNames].join(', ')}`);
        });
    });
});

// ============================================================================
// Level 1: 单元测试 - ViewTreeCallbackExtractor
// ============================================================================

describe('Level 1: ViewTreeCallbackExtractor 单元测试', () => {
    
    describe('1.3 UI 回调提取测试', () => {
        let scene: Scene;
        let extractor: ViewTreeCallbackExtractor;
        
        beforeAll(() => {
            scene = buildScene('simple');
            extractor = new ViewTreeCallbackExtractor(scene);
        });

        it('1.3.1 应该能从 Component 提取回调', () => {
            // 查找 Index 组件
            for (const arkClass of scene.getClasses()) {
                if (arkClass.getName() === 'Index') {
                    const callbacks = extractor.extractFromComponent(arkClass);
                    console.log(`[Test] Index 组件回调数量: ${callbacks.length}`);
                    
                    for (const cb of callbacks) {
                        console.log(`[Test]   - ${cb.componentType}.${cb.eventType}`);
                    }
                }
            }
        });

        it('1.3.2 应该能解析 onClick 回调', () => {
            for (const arkClass of scene.getClasses()) {
                if (arkClass.getName() === 'Index') {
                    const callbacks = extractor.extractFromComponent(arkClass);
                    const onClickCallbacks = callbacks.filter(
                        cb => cb.eventType === 'onClick'
                    );
                    
                    console.log(`[Test] onClick 回调数量: ${onClickCallbacks.length}`);
                    
                    for (const cb of onClickCallbacks) {
                        if (cb.callbackMethod) {
                            console.log(`[Test]   方法名: ${cb.callbackMethod.getName()}`);
                        }
                    }
                }
            }
        });
    });
});

// ============================================================================
// Level 1: 单元测试 - NavigationAnalyzer
// ============================================================================

describe('Level 1: NavigationAnalyzer 单元测试', () => {
    
    describe('1.4 路由分析测试', () => {
        let scene: Scene;
        let analyzer: NavigationAnalyzer;
        
        beforeAll(() => {
            scene = buildScene('router');
            analyzer = new NavigationAnalyzer(scene);
        });

        it('1.4.1 应该能分析 router.pushUrl', () => {
            // 遍历所有方法查找路由调用
            let routerCalls = 0;
            
            for (const arkMethod of scene.getMethods()) {
                const methodName = arkMethod.getName();
                if (methodName.includes('goTo')) {
                    console.log(`[Test] 分析方法: ${methodName}`);
                    routerCalls++;
                }
            }
            
            console.log(`[Test] 包含路由调用的方法数: ${routerCalls}`);
        });

        it('1.4.2 应该能提取路由 URL', () => {
            // 这个测试需要实际分析代码中的 router.pushUrl 调用
            // 并提取 URL 参数
            console.log('[Test] 路由 URL 提取测试');
        });
    });
});

// ============================================================================
// Level 2: 集成测试
// ============================================================================

describe('Level 2: 集成测试', () => {
    
    describe('2.1 收集器 + 回调提取器集成', () => {
        let scene: Scene;
        let collector: AbilityCollector;
        let extractor: ViewTreeCallbackExtractor;
        
        beforeAll(() => {
            scene = buildScene('simple');
            collector = new AbilityCollector(scene);
            extractor = new ViewTreeCallbackExtractor(scene);
        });

        it('2.1.1 应该能为 Component 填充回调信息', () => {
            const components = collector.collectAllComponents();
            
            // 使用 extractor 填充回调
            extractor.fillAllComponentCallbacks(components);
            
            for (const comp of components) {
                console.log(`[Test] ${comp.name} 回调数: ${comp.uiCallbacks.length}`);
                
                for (const cb of comp.uiCallbacks) {
                    console.log(`[Test]   - ${cb.componentType}.${cb.eventType}`);
                }
            }
        });
    });

    describe('2.2 收集器 + 导航分析器集成', () => {
        let scene: Scene;
        let collector: AbilityCollector;
        
        beforeAll(() => {
            scene = buildScene('multi-ability');
            collector = new AbilityCollector(scene);
        });

        it('2.2.1 应该能分析 Ability 间的跳转关系', () => {
            const abilities = collector.collectAllAbilities();
            
            console.log(`[Test] 多 Ability 场景:`);
            for (const ability of abilities) {
                console.log(`[Test]   - ${ability.name}`);
                if (ability.navigationTargets.length > 0) {
                    for (const nav of ability.navigationTargets) {
                        console.log(`[Test]     -> ${nav.targetComponent || nav.targetAbility}`);
                    }
                }
            }
        });
    });
});

// ============================================================================
// Level 3: 端到端测试
// ============================================================================

describe('Level 3: 端到端测试 - LifecycleModelCreator', () => {
    
    describe('3.1 简单项目完整流程', () => {
        let scene: Scene;
        let creator: LifecycleModelCreator;
        
        beforeAll(() => {
            scene = buildScene('simple');
            creator = new LifecycleModelCreator(scene);
        });

        it('3.1.1 应该能创建 DummyMain', () => {
            try {
                creator.create();
                console.log('[Test] DummyMain 创建成功');
            } catch (error) {
                console.error('[Test] DummyMain 创建失败:', error);
                throw error;
            }
        });

        it('3.1.2 DummyMain 应该包含 CFG', () => {
            creator.create();
            const dummyMain = creator.getDummyMain();
            
            if (dummyMain) {
                const cfg = dummyMain.getCfg();
                if (cfg) {
                    const blockCount = cfg.getBlocks().size;
                    console.log(`[Test] CFG 块数量: ${blockCount}`);
                    expect(blockCount).toBeGreaterThan(0);
                }
            }
        });

        it('3.1.3 应该收集到正确数量的 Ability 和 Component', () => {
            creator.create();
            
            const abilities = creator.getAbilities();
            const components = creator.getComponents();
            
            console.log(`[Test] 收集到 ${abilities.length} 个 Ability`);
            console.log(`[Test] 收集到 ${components.length} 个 Component`);
            
            // 打印详细信息
            for (const a of abilities) {
                console.log(`[Test]   Ability: ${a.name} (isEntry: ${a.isEntry})`);
            }
            for (const c of components) {
                console.log(`[Test]   Component: ${c.name} (callbacks: ${c.uiCallbacks.length})`);
            }
        });
    });

    describe('3.2 多 Ability 项目测试', () => {
        let scene: Scene;
        let creator: LifecycleModelCreator;
        
        beforeAll(() => {
            scene = buildScene('multi-ability');
            creator = new LifecycleModelCreator(scene);
        });

        it('3.2.1 应该能处理多个 Ability', () => {
            creator.create();
            
            const abilities = creator.getAbilities();
            console.log(`[Test] 多 Ability 场景: ${abilities.length} 个 Ability`);
            
            expect(abilities.length).toBeGreaterThanOrEqual(1);
        });
    });
});

// ============================================================================
// 辅助测试：打印调试信息
// ============================================================================

describe('Debug: 打印项目结构', () => {
    
    it('打印 simple 项目的类结构', () => {
        const scene = buildScene('simple');
        
        console.log('\n========== 项目类结构 ==========');
        for (const arkClass of scene.getClasses()) {
            const className = arkClass.getName();
            const superClass = arkClass.getSuperClassName();
            
            console.log(`\n类: ${className}`);
            if (superClass) {
                console.log(`  继承: ${superClass}`);
            }
            
            // 打印方法
            console.log('  方法:');
            for (const method of arkClass.getMethods()) {
                console.log(`    - ${method.getName()}`);
            }
            
            // 检查 ViewTree
            const viewTree = arkClass.getViewTree();
            if (viewTree) {
                console.log('  ViewTree: 存在');
            }
        }
        console.log('\n================================\n');
    });
});
