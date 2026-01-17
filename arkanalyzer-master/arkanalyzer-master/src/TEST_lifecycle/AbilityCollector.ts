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
 * @file AbilityCollector.ts
 * @description Ability 和 Component 信息收集器
 * 
 * 本模块负责从 Scene 中收集所有 Ability 和 Component 的信息，包括：
 * - 识别所有继承 UIAbility 的类
 * - 收集每个 Ability 的生命周期方法
 * - 识别所有 @Component 装饰的组件
 * - 分析页面跳转关系（startAbility, router.pushUrl 等）
 */

import { Scene } from '../Scene';
import { ArkClass } from '../core/model/ArkClass';
import { ArkMethod } from '../core/model/ArkMethod';
import { ClassSignature } from '../core/model/ArkSignature';
import {
    AbilityInfo,
    ComponentInfo,
    AbilityLifecycleStage,
    ComponentLifecycleStage,
    AbilityNavigationTarget,
    NavigationType,
} from './LifecycleTypes';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * Ability 基类名称列表
 * 继承这些类的都被认为是 Ability
 */
const ABILITY_BASE_CLASSES: string[] = [
    'UIAbility',
    'Ability',
    'UIExtensionAbility',
    'FormExtensionAbility',
    'BackupExtensionAbility',
];

/**
 * Component 基类名称列表
 */
const COMPONENT_BASE_CLASSES: string[] = [
    'CustomComponent',
    'ViewPU',
];

/**
 * Ability 生命周期方法名称
 */
const ABILITY_LIFECYCLE_METHODS: string[] = [
    'onCreate',
    'onDestroy',
    'onWindowStageCreate',
    'onWindowStageDestroy',
    'onForeground',
    'onBackground',
];

/**
 * Component 生命周期方法名称
 */
const COMPONENT_LIFECYCLE_METHODS: string[] = [
    'aboutToAppear',
    'aboutToDisappear',
    'build',
    'onPageShow',
    'onPageHide',
];

// ============================================================================
// AbilityCollector 类
// ============================================================================

/**
 * Ability 和 Component 信息收集器
 * 
 * 使用方式：
 * ```typescript
 * const collector = new AbilityCollector(scene);
 * const abilities = collector.collectAllAbilities();
 * const components = collector.collectAllComponents();
 * ```
 */
export class AbilityCollector {
    /** 分析场景 */
    private scene: Scene;
    
    /** 缓存：已收集的 Ability 信息 */
    private abilityCache: Map<ClassSignature, AbilityInfo> = new Map();
    
    /** 缓存：已收集的 Component 信息 */
    private componentCache: Map<ClassSignature, ComponentInfo> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // ========================================================================
    // 公共 API
    // ========================================================================

    /**
     * 收集所有 Ability 信息
     * 
     * @returns Ability 信息数组
     */
    public collectAllAbilities(): AbilityInfo[] {
        const abilities: AbilityInfo[] = [];
        
        // 遍历 Scene 中的所有类
        for (const arkClass of this.scene.getClasses()) {
            if (this.isAbilityClass(arkClass)) {
                const abilityInfo = this.buildAbilityInfo(arkClass);
                abilities.push(abilityInfo);
                this.abilityCache.set(arkClass.getSignature(), abilityInfo);
            }
        }
        
        // 第二遍：分析跳转关系（需要在所有 Ability 收集完后进行）
        for (const ability of abilities) {
            this.analyzeNavigationTargets(ability);
        }
        
        return abilities;
    }

    /**
     * 收集所有 Component 信息
     * 
     * @returns Component 信息数组
     */
    public collectAllComponents(): ComponentInfo[] {
        const components: ComponentInfo[] = [];
        
        for (const arkClass of this.scene.getClasses()) {
            if (this.isComponentClass(arkClass)) {
                const componentInfo = this.buildComponentInfo(arkClass);
                components.push(componentInfo);
                this.componentCache.set(arkClass.getSignature(), componentInfo);
            }
        }
        
        return components;
    }

    /**
     * 获取入口 Ability
     * 
     * @returns 入口 Ability（如果找到）
     */
    public getEntryAbility(): AbilityInfo | null {
        // TODO: 从 module.json5 配置文件中读取入口 Ability
        // 当前简化实现：返回第一个找到的 Ability
        const abilities = this.collectAllAbilities();
        return abilities.length > 0 ? abilities[0] : null;
    }

    // ========================================================================
    // 私有方法：类型判断
    // ========================================================================

    /**
     * 判断一个类是否是 Ability
     * 
     * 判断依据：
     * 1. 直接继承 ABILITY_BASE_CLASSES 中的类
     * 2. 间接继承（祖先类是 Ability）
     */
    private isAbilityClass(arkClass: ArkClass): boolean {
        // 检查直接父类
        const superClassName = arkClass.getSuperClassName();
        if (ABILITY_BASE_CLASSES.includes(superClassName)) {
            return true;
        }
        
        // 检查继承链
        let superClass = arkClass.getSuperClass();
        while (superClass) {
            if (ABILITY_BASE_CLASSES.includes(superClass.getSuperClassName())) {
                return true;
            }
            superClass = superClass.getSuperClass();
        }
        
        return false;
    }

    /**
     * 判断一个类是否是 Component
     * 
     * 判断依据：
     * 1. 继承 COMPONENT_BASE_CLASSES
     * 2. 有 @Component 装饰器
     */
    private isComponentClass(arkClass: ArkClass): boolean {
        // 检查父类
        if (COMPONENT_BASE_CLASSES.includes(arkClass.getSuperClassName())) {
            return true;
        }
        
        // 检查装饰器
        if (arkClass.hasDecorator('Component')) {
            return true;
        }
        
        return false;
    }

    // ========================================================================
    // 私有方法：信息构建
    // ========================================================================

    /**
     * 构建 AbilityInfo
     */
    private buildAbilityInfo(arkClass: ArkClass): AbilityInfo {
        const info: AbilityInfo = {
            arkClass: arkClass,
            signature: arkClass.getSignature(),
            name: arkClass.getName(),
            lifecycleMethods: this.collectAbilityLifecycleMethods(arkClass),
            components: [], // 将在后续填充
            navigationTargets: [], // 将在后续填充
            isEntry: this.checkIsEntryAbility(arkClass),
        };
        
        return info;
    }

    /**
     * 构建 ComponentInfo
     */
    private buildComponentInfo(arkClass: ArkClass): ComponentInfo {
        const info: ComponentInfo = {
            arkClass: arkClass,
            signature: arkClass.getSignature(),
            name: arkClass.getName(),
            lifecycleMethods: this.collectComponentLifecycleMethods(arkClass),
            uiCallbacks: [], // 将由 ViewTreeCallbackExtractor 填充
            isEntry: arkClass.hasDecorator('Entry'),
        };
        
        return info;
    }

    /**
     * 收集 Ability 的生命周期方法
     */
    private collectAbilityLifecycleMethods(arkClass: ArkClass): Map<AbilityLifecycleStage, ArkMethod> {
        const methods = new Map<AbilityLifecycleStage, ArkMethod>();
        
        for (const method of arkClass.getMethods()) {
            const methodName = method.getName();
            
            // 映射方法名到生命周期阶段
            switch (methodName) {
                case 'onCreate':
                    methods.set(AbilityLifecycleStage.CREATE, method);
                    break;
                case 'onDestroy':
                    methods.set(AbilityLifecycleStage.DESTROY, method);
                    break;
                case 'onWindowStageCreate':
                    methods.set(AbilityLifecycleStage.WINDOW_STAGE_CREATE, method);
                    break;
                case 'onWindowStageDestroy':
                    methods.set(AbilityLifecycleStage.WINDOW_STAGE_DESTROY, method);
                    break;
                case 'onForeground':
                    methods.set(AbilityLifecycleStage.FOREGROUND, method);
                    break;
                case 'onBackground':
                    methods.set(AbilityLifecycleStage.BACKGROUND, method);
                    break;
            }
        }
        
        return methods;
    }

    /**
     * 收集 Component 的生命周期方法
     */
    private collectComponentLifecycleMethods(arkClass: ArkClass): Map<ComponentLifecycleStage, ArkMethod> {
        const methods = new Map<ComponentLifecycleStage, ArkMethod>();
        
        for (const method of arkClass.getMethods()) {
            const methodName = method.getName();
            
            switch (methodName) {
                case 'aboutToAppear':
                    methods.set(ComponentLifecycleStage.ABOUT_TO_APPEAR, method);
                    break;
                case 'aboutToDisappear':
                    methods.set(ComponentLifecycleStage.ABOUT_TO_DISAPPEAR, method);
                    break;
                case 'build':
                    methods.set(ComponentLifecycleStage.BUILD, method);
                    break;
                case 'onPageShow':
                    methods.set(ComponentLifecycleStage.PAGE_SHOW, method);
                    break;
                case 'onPageHide':
                    methods.set(ComponentLifecycleStage.PAGE_HIDE, method);
                    break;
            }
        }
        
        return methods;
    }

    // ========================================================================
    // 私有方法：跳转分析
    // ========================================================================

    /**
     * 分析 Ability 的跳转目标
     * 
     * 扫描 Ability 中的所有方法，查找 startAbility/router.pushUrl 等调用
     */
    private analyzeNavigationTargets(ability: AbilityInfo): void {
        // TODO: 实现跳转分析逻辑
        // 
        // 实现思路：
        // 1. 遍历 Ability 的所有方法
        // 2. 扫描每条语句，查找 InvokeExpr
        // 3. 如果调用的是 startAbility / router.pushUrl 等
        // 4. 尝试解析参数中的目标 Ability 名称
        // 5. 添加到 navigationTargets 列表
        //
        // 示例代码结构：
        // for (const method of ability.arkClass.getMethods()) {
        //     const cfg = method.getCfg();
        //     if (!cfg) continue;
        //     
        //     for (const stmt of cfg.getStmts()) {
        //         const invokeExpr = stmt.getInvokeExpr();
        //         if (invokeExpr && this.isNavigationCall(invokeExpr)) {
        //             const target = this.parseNavigationTarget(invokeExpr, method);
        //             if (target) {
        //                 ability.navigationTargets.push(target);
        //             }
        //         }
        //     }
        // }
        
        console.log(`[AbilityCollector] TODO: Analyze navigation targets for ${ability.name}`);
    }

    /**
     * 检查是否是入口 Ability
     * 
     * TODO: 从 module.json5 读取配置
     */
    private checkIsEntryAbility(arkClass: ArkClass): boolean {
        // TODO: 解析 module.json5 文件，查找 mainElement 配置
        // 当前简化：检查类名是否包含 "Entry" 或 "Main"
        const className = arkClass.getName();
        return className.includes('Entry') || className.includes('Main');
    }

    // ========================================================================
    // 工具方法
    // ========================================================================

    /**
     * 根据签名获取已收集的 Ability
     */
    public getAbilityBySignature(signature: ClassSignature): AbilityInfo | undefined {
        return this.abilityCache.get(signature);
    }

    /**
     * 根据签名获取已收集的 Component
     */
    public getComponentBySignature(signature: ClassSignature): ComponentInfo | undefined {
        return this.componentCache.get(signature);
    }

    /**
     * 获取 Scene
     */
    public getScene(): Scene {
        return this.scene;
    }
}
