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
 * @file ViewTreeCallbackExtractor.ts
 * @description 从 ViewTree 中提取 UI 回调信息
 * 
 * 本模块负责：
 * - 遍历 Component 的 ViewTree
 * - 提取每个 UI 控件上的事件回调（onClick, onTouch 等）
 * - 建立控件与回调方法的精确关联
 * 
 * 这是对原有 DummyMainCreater.getCallbackMethods() 的精细化扩展
 */

import { Scene } from '../Scene';
import { ArkClass } from '../core/model/ArkClass';
import { ArkMethod } from '../core/model/ArkMethod';
import { ArkField } from '../core/model/ArkField';
import { ViewTree, ViewTreeNode } from '../core/graph/ViewTree';
import { MethodSignature } from '../core/model/ArkSignature';
import { FunctionType } from '../core/base/Type';
import { ArkInstanceFieldRef } from '../core/base/Ref';
import { Constant } from '../core/base/Constant';
import {
    UICallbackInfo,
    UIEventType,
    ComponentInfo,
} from './LifecycleTypes';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * UI 事件方法名称列表
 */
const UI_EVENT_METHODS: string[] = [
    'onClick',
    'onTouch',
    'onAppear',
    'onDisAppear',
    'onDragStart',
    'onDragEnter',
    'onDragMove',
    'onDragLeave',
    'onDrop',
    'onKeyEvent',
    'onFocus',
    'onBlur',
    'onHover',
    'onMouse',
    'onAreaChange',
    'onVisibleAreaChange',
];

/**
 * 方法名到事件类型的映射
 */
const METHOD_TO_EVENT_TYPE: Map<string, UIEventType> = new Map([
    ['onClick', UIEventType.ON_CLICK],
    ['onTouch', UIEventType.ON_TOUCH],
    ['onAppear', UIEventType.ON_APPEAR],
    ['onDisAppear', UIEventType.ON_DISAPPEAR],
    ['onDragStart', UIEventType.ON_DRAG_START],
    ['onDrop', UIEventType.ON_DROP],
    ['onFocus', UIEventType.ON_FOCUS],
    ['onBlur', UIEventType.ON_BLUR],
    ['onAreaChange', UIEventType.ON_AREA_CHANGE],
]);

// ============================================================================
// ViewTreeCallbackExtractor 类
// ============================================================================

/**
 * ViewTree 回调提取器
 * 
 * 功能：从 ViewTree 中精细化提取 UI 回调信息
 * 
 * 与原有 getCallbackMethods 的区别：
 * - 原方法：直接收集所有 onClick 等方法，不区分控件
 * - 本方法：按控件提取，保留控件类型、状态变量依赖等上下文
 * 
 * 使用方式：
 * ```typescript
 * const extractor = new ViewTreeCallbackExtractor(scene);
 * const callbacks = extractor.extractFromComponent(componentClass);
 * ```
 */
export class ViewTreeCallbackExtractor {
    /** 分析场景 */
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    // ========================================================================
    // 公共 API
    // ========================================================================

    /**
     * 从 Component 类中提取所有 UI 回调
     * 
     * @param componentClass Component 类
     * @returns UI 回调信息数组
     */
    public extractFromComponent(componentClass: ArkClass): UICallbackInfo[] {
        const callbacks: UICallbackInfo[] = [];
        
        // 获取 Component 的 ViewTree
        const viewTree = componentClass.getViewTree();
        if (!viewTree) {
            console.log(`[ViewTreeCallbackExtractor] No ViewTree for ${componentClass.getName()}`);
            return callbacks;
        }
        
        // 获取根节点
        const root = viewTree.getRoot();
        if (!root) {
            console.log(`[ViewTreeCallbackExtractor] Empty ViewTree for ${componentClass.getName()}`);
            return callbacks;
        }
        
        // 遍历 ViewTree，提取回调
        this.walkViewTree(root, callbacks, componentClass);
        
        return callbacks;
    }

    /**
     * 为 ComponentInfo 填充 UI 回调
     * 
     * @param componentInfo Component 信息（会被修改）
     */
    public fillComponentCallbacks(componentInfo: ComponentInfo): void {
        const callbacks = this.extractFromComponent(componentInfo.arkClass);
        componentInfo.uiCallbacks = callbacks;
    }

    /**
     * 批量提取多个 Component 的回调
     * 
     * @param components Component 信息数组
     */
    public fillAllComponentCallbacks(components: ComponentInfo[]): void {
        for (const component of components) {
            this.fillComponentCallbacks(component);
        }
    }

    // ========================================================================
    // 私有方法：ViewTree 遍历
    // ========================================================================

    /**
     * 递归遍历 ViewTree 节点
     * 
     * @param node 当前节点
     * @param callbacks 回调收集数组
     * @param componentClass 所属 Component 类
     */
    private walkViewTree(
        node: ViewTreeNode,
        callbacks: UICallbackInfo[],
        componentClass: ArkClass
    ): void {
        // 提取当前节点的回调
        const nodeCallbacks = this.extractNodeCallbacks(node, componentClass);
        callbacks.push(...nodeCallbacks);
        
        // 递归处理子节点
        for (const child of node.children) {
            this.walkViewTree(child, callbacks, componentClass);
        }
    }

    /**
     * 从单个 ViewTree 节点提取回调
     * 
     * @param node ViewTree 节点
     * @param componentClass 所属 Component 类
     * @returns 该节点的回调信息数组
     */
    private extractNodeCallbacks(
        node: ViewTreeNode,
        componentClass: ArkClass
    ): UICallbackInfo[] {
        const callbacks: UICallbackInfo[] = [];
        
        // 遍历节点的 attributes（属性和事件）
        for (const [attributeName, attributeValue] of node.attributes) {
            // 检查是否是事件属性
            if (!this.isEventAttribute(attributeName)) {
                continue;
            }
            
            // 尝试解析回调方法
            const callbackMethod = this.resolveCallbackMethod(attributeValue, componentClass);
            if (!callbackMethod) {
                continue;
            }
            
            // 构建 UICallbackInfo
            const callbackInfo: UICallbackInfo = {
                componentType: node.name,
                eventType: this.getEventType(attributeName),
                callbackMethod: callbackMethod,
                relatedStateValues: this.collectRelatedStateValues(node, attributeValue),
                viewTreeNode: node,
            };
            
            callbacks.push(callbackInfo);
        }
        
        return callbacks;
    }

    // ========================================================================
    // 私有方法：辅助函数
    // ========================================================================

    /**
     * 判断属性名是否是事件属性
     */
    private isEventAttribute(attributeName: string): boolean {
        return UI_EVENT_METHODS.includes(attributeName);
    }

    /**
     * 获取事件类型枚举
     */
    private getEventType(attributeName: string): UIEventType {
        return METHOD_TO_EVENT_TYPE.get(attributeName) || UIEventType.ON_CLICK;
    }

    /**
     * 解析回调方法
     * 
     * 从 attribute 的值中解析出实际的回调方法
     * 
     * 支持的回调形式：
     * ```
     * ┌─────────────────────────────────────────────────────────────────┐
     * │                    回调方法解析流程                              │
     * ├─────────────────────────────────────────────────────────────────┤
     * │                                                                 │
     * │  Button('Click').onClick(???)                                   │
     * │                          │                                      │
     * │      ┌───────────────────┼───────────────────┐                  │
     * │      ▼                   ▼                   ▼                  │
     * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
     * │  │MethodSig    │  │FieldRef    │  │ Constant    │             │
     * │  │(方法签名)    │  │(this.xxx)  │  │('方法名')   │             │
     * │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
     * │         │                │                │                     │
     * │         ▼                ▼                ▼                     │
     * │  scene.getMethod  class.getMethod  class.getMethodWithName     │
     * │         │                │                │                     │
     * │         └────────────────┴────────────────┘                     │
     * │                          │                                      │
     * │                          ▼                                      │
     * │                    ArkMethod (回调方法)                          │
     * │                                                                 │
     * └─────────────────────────────────────────────────────────────────┘
     * ```
     * 
     * @param attributeValue [Stmt, 关联值数组]
     * @param componentClass 所属 Component 类
     * @returns 回调方法（如果能解析到）
     */
    private resolveCallbackMethod(
        attributeValue: [any, (Constant | ArkInstanceFieldRef | MethodSignature)[]],
        componentClass: ArkClass
    ): ArkMethod | null {
        const [stmt, relatedValues] = attributeValue;
        
        // 遍历所有关联值，尝试解析出回调方法
        for (const value of relatedValues) {
            const method = this.resolveFromSingleValue(value, componentClass);
            if (method) {
                console.log(`[ViewTreeCallbackExtractor] Resolved callback: ${method.getName()}`);
                return method;
            }
        }
        
        // 如果关联值中没有找到，尝试从语句中解析（Lambda 情况）
        const lambdaMethod = this.resolveLambdaFromStmt(stmt, componentClass);
        if (lambdaMethod) {
            console.log(`[ViewTreeCallbackExtractor] Resolved lambda callback: ${lambdaMethod.getName()}`);
            return lambdaMethod;
        }
        
        console.log(`[ViewTreeCallbackExtractor] Failed to resolve callback from ${relatedValues.length} values`);
        return null;
    }
    
    /**
     * 从单个值解析回调方法
     * 
     * @param value 关联值（MethodSignature | ArkInstanceFieldRef | Constant）
     * @param componentClass 所属 Component 类
     * @returns 解析到的方法
     */
    private resolveFromSingleValue(
        value: MethodSignature | ArkInstanceFieldRef | Constant,
        componentClass: ArkClass
    ): ArkMethod | null {
        // 情况 1: 直接是方法签名
        // 代码形式: Button().onClick(this.handleClick)
        // ArkAnalyzer 可能将 this.handleClick 解析为 MethodSignature
        if (value instanceof MethodSignature) {
            return this.resolveFromMethodSignature(value, componentClass);
        }
        
        // 情况 2: 实例字段引用
        // 代码形式: Button().onClick(this.handleClick)
        // 其中 this.handleClick 可能被表示为 ArkInstanceFieldRef
        if (value instanceof ArkInstanceFieldRef) {
            return this.resolveFromFieldRef(value, componentClass);
        }
        
        // 情况 3: 字符串常量（方法名）
        // 代码形式: Button().onClick('handleClick')（较少见）
        if (value instanceof Constant) {
            return this.resolveFromConstant(value, componentClass);
        }
        
        return null;
    }
    
    /**
     * 从方法签名解析回调方法
     * 
     * 处理形式: onClick(this.handleClick) 其中 handleClick 已解析为 MethodSignature
     */
    private resolveFromMethodSignature(
        sig: MethodSignature,
        componentClass: ArkClass
    ): ArkMethod | null {
        // 方法 1: 从 Scene 全局查找
        const methodFromScene = this.scene.getMethod(sig);
        if (methodFromScene) {
            return methodFromScene;
        }
        
        // 方法 2: 从当前类中按签名查找
        const methodFromClass = componentClass.getMethod(sig);
        if (methodFromClass) {
            return methodFromClass;
        }
        
        // 方法 3: 从当前类中按名称查找（签名匹配失败时的后备方案）
        const methodName = sig.getMethodSubSignature().getMethodName();
        const methodByName = componentClass.getMethodWithName(methodName);
        if (methodByName) {
            return methodByName;
        }
        
        // 方法 4: 检查父类
        const superClass = this.getSuperClass(componentClass);
        if (superClass) {
            const methodFromSuper = superClass.getMethodWithName(methodName);
            if (methodFromSuper) {
                return methodFromSuper;
            }
        }
        
        return null;
    }
    
    /**
     * 从字段引用解析回调方法
     * 
     * 处理形式: onClick(this.handleClick) 其中 this.handleClick 是 ArkInstanceFieldRef
     */
    private resolveFromFieldRef(
        fieldRef: ArkInstanceFieldRef,
        componentClass: ArkClass
    ): ArkMethod | null {
        const fieldName = fieldRef.getFieldName();
        
        // 尝试将字段名作为方法名查找
        // 因为 this.handleClick 中的 handleClick 可能是方法名
        const method = componentClass.getMethodWithName(fieldName);
        if (method) {
            return method;
        }
        
        // 检查父类
        const superClass = this.getSuperClass(componentClass);
        if (superClass) {
            const methodFromSuper = superClass.getMethodWithName(fieldName);
            if (methodFromSuper) {
                return methodFromSuper;
            }
        }
        
        // 如果找不到方法，可能是真正的字段（存储了函数引用）
        // 这种情况较复杂，暂时不处理
        console.log(`[ViewTreeCallbackExtractor] Field ref '${fieldName}' is not a method`);
        return null;
    }
    
    /**
     * 从常量解析回调方法
     * 
     * 处理形式: onClick('handleClick')（字符串形式的方法名）
     */
    private resolveFromConstant(
        constant: Constant,
        componentClass: ArkClass
    ): ArkMethod | null {
        const value = constant.getValue();
        
        // 检查是否是字符串类型
        if (typeof value !== 'string') {
            return null;
        }
        
        // 将字符串作为方法名查找
        const method = componentClass.getMethodWithName(value);
        if (method) {
            return method;
        }
        
        // 检查父类
        const superClass = this.getSuperClass(componentClass);
        if (superClass) {
            return superClass.getMethodWithName(value);
        }
        
        return null;
    }
    
    /**
     * 从语句中解析 Lambda 表达式
     * 
     * 处理形式:
     * ```typescript
     * Button().onClick(() => {
     *     this.count++;
     * })
     * ```
     * 
     * Lambda 表达式可能被 ArkAnalyzer 转换为匿名方法或内联代码
     */
    private resolveLambdaFromStmt(
        stmt: any,
        componentClass: ArkClass
    ): ArkMethod | null {
        // Lambda 的处理比较复杂，ArkAnalyzer 可能：
        // 1. 为 Lambda 生成一个匿名方法（如 lambda$onClick$1）
        // 2. 将 Lambda 内联到调用点
        
        // 查找可能的匿名/Lambda 方法
        // ArkAnalyzer 通常会给 Lambda 生成特殊名称
        for (const method of componentClass.getMethods()) {
            const methodName = method.getName();
            
            // 检查是否是生成的 Lambda 方法
            // 常见的 Lambda 方法命名模式
            if (methodName.includes('lambda') || 
                methodName.includes('anonymous') ||
                methodName.startsWith('$')) {
                
                // TODO: 需要进一步验证这个 Lambda 是否与当前 stmt 关联
                // 暂时不返回 Lambda 方法，因为无法确定关联性
            }
        }
        
        // 当前简化处理：不解析 Lambda
        // 完整实现需要分析 stmt 的结构来确定 Lambda 定义
        return null;
    }
    
    /**
     * 获取父类
     */
    private getSuperClass(arkClass: ArkClass): ArkClass | null {
        const superClassName = arkClass.getSuperClassName();
        if (!superClassName || superClassName === 'Object') {
            return null;
        }
        
        // 从 Scene 中查找父类
        for (const cls of this.scene.getClasses()) {
            if (cls.getName() === superClassName) {
                return cls;
            }
        }
        
        return null;
    }
    
    // ========================================================================
    // 辅助方法（保留原有的）
    // ========================================================================
    
    /**
     * 收集关联的状态变量
     * 
     * @param node ViewTree 节点
     * @param attributeValue 属性值
     * @returns 状态变量数组
     */
    private collectRelatedStateValues(
        node: ViewTreeNode,
        attributeValue: [any, (Constant | ArkInstanceFieldRef | MethodSignature)[]]
    ): ArkField[] {
        // 从节点的 stateValues 中收集
        const stateValues: ArkField[] = [];
        node.stateValues.forEach(field => stateValues.push(field));
        return stateValues;
    }
}

// ============================================================================
// 导出辅助函数
// ============================================================================

/**
 * 快速提取 Component 的所有 UI 回调
 * 
 * @param scene 分析场景
 * @param componentClass Component 类
 * @returns UI 回调信息数组
 */
export function extractUICallbacks(scene: Scene, componentClass: ArkClass): UICallbackInfo[] {
    const extractor = new ViewTreeCallbackExtractor(scene);
    return extractor.extractFromComponent(componentClass);
}
