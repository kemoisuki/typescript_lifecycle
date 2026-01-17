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
     * @param attributeValue [Stmt, 关联值数组]
     * @param componentClass 所属 Component 类
     * @returns 回调方法（如果能解析到）
     */
    private resolveCallbackMethod(
        attributeValue: [any, (Constant | ArkInstanceFieldRef | MethodSignature)[]],
        componentClass: ArkClass
    ): ArkMethod | null {
        // TODO: 实现完整的回调解析逻辑
        //
        // 实现思路：
        // 1. attributeValue[1] 包含关联值，可能是 MethodSignature 或 FunctionType
        // 2. 如果是 MethodSignature，直接从 Scene 获取方法
        // 3. 如果是匿名函数，需要从 Stmt 中解析
        //
        // 示例伪代码：
        // const [stmt, relatedValues] = attributeValue;
        // for (const value of relatedValues) {
        //     if (value instanceof MethodSignature) {
        //         const method = this.scene.getMethod(value);
        //         if (method) return method;
        //     }
        // }
        
        const [stmt, relatedValues] = attributeValue;
        
        for (const value of relatedValues) {
            if (value instanceof MethodSignature) {
                const method = this.scene.getMethod(value);
                if (method) {
                    return method;
                }
            }
        }
        
        // 备选：尝试从语句中提取
        // TODO: 处理匿名函数的情况
        
        return null;
    }

    /**
     * 收集回调相关的状态变量
     * 
     * @param node ViewTree 节点
     * @param attributeValue 属性值
     * @returns 相关的状态变量数组
     */
    private collectRelatedStateValues(
        node: ViewTreeNode,
        attributeValue: [any, (Constant | ArkInstanceFieldRef | MethodSignature)[]]
    ): ArkField[] {
        const stateValues: ArkField[] = [];
        
        // 从 ViewTreeNode 的 stateValues 中获取
        for (const field of node.stateValues) {
            stateValues.push(field);
        }
        
        // TODO: 从 attributeValue 中进一步分析
        
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
