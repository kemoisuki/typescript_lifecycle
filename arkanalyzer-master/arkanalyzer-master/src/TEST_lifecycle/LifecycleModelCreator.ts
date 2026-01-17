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
 * @file LifecycleModelCreator.ts
 * @description 扩展版 DummyMain 创建器
 * 
 * 本模块是对原有 DummyMainCreater 的扩展，主要增强功能：
 * 
 * 1. **多 Ability 支持**
 *    - 收集项目中所有 Ability
 *    - 按启动顺序/跳转关系建模
 * 
 * 2. **精细化 UI 回调**
 *    - 利用 ViewTree 提取控件信息
 *    - 按控件实例化后调用对应回调
 * 
 * 3. **页面跳转建模**
 *    - 分析 startAbility/router.pushUrl 等调用
 *    - 在 CFG 中体现跳转关系
 * 
 * 生成的 DummyMain 结构：
 * ```
 * function @extendedDummyMain() {
 *     // 1. 静态初始化
 *     staticInit()
 *     
 *     // 2. 对每个 Ability:
 *     while (true) {
 *         // 2.1 创建 Ability 实例
 *         ability1 = new Ability1()
 *         
 *         // 2.2 调用生命周期方法
 *         ability1.onCreate(want)
 *         ability1.onWindowStageCreate(windowStage)
 *         ability1.onForeground()
 *         
 *         // 2.3 加载关联的 Component
 *         component1 = new Component1()
 *         component1.aboutToAppear()
 *         component1.build()
 *         
 *         // 2.4 精细化调用 UI 回调
 *         // Button 控件的 onClick
 *         button1.onClick()
 *         // Text 控件的 onAppear
 *         text1.onAppear()
 *         
 *         // 2.5 模拟跳转到其他 Ability
 *         if (count == x) {
 *             ability2.onCreate(...)
 *         }
 *         
 *         // 2.6 调用后台/销毁生命周期
 *         ability1.onBackground()
 *         ability1.onDestroy()
 *     }
 *     return
 * }
 * ```
 */

import { Scene } from '../Scene';
import { ArkClass } from '../core/model/ArkClass';
import { ArkMethod } from '../core/model/ArkMethod';
import { ArkFile, Language } from '../core/model/ArkFile';
import { ArkBody } from '../core/model/ArkBody';
import { Local } from '../core/base/Local';
import { ClassType, NumberType } from '../core/base/Type';
import { Constant } from '../core/base/Constant';
import {
    ArkAssignStmt,
    ArkIfStmt,
    ArkInvokeStmt,
    ArkReturnVoidStmt,
} from '../core/base/Stmt';
import {
    ArkConditionExpr,
    ArkInstanceInvokeExpr,
    ArkNewExpr,
    ArkStaticInvokeExpr,
    RelationalBinaryOperator,
} from '../core/base/Expr';
import { BasicBlock } from '../core/graph/BasicBlock';
import { Cfg } from '../core/graph/Cfg';
import { ClassSignature, FileSignature, MethodSignature } from '../core/model/ArkSignature';
import { ArkSignatureBuilder } from '../core/model/builder/ArkSignatureBuilder';
import { checkAndUpdateMethod } from '../core/model/builder/ArkMethodBuilder';
import { ValueUtil } from '../core/common/ValueUtil';
import { CONSTRUCTOR_NAME } from '../core/common/TSConst';

// 导入自定义模块
import { AbilityCollector } from './AbilityCollector';
import { ViewTreeCallbackExtractor } from './ViewTreeCallbackExtractor';
import {
    AbilityInfo,
    ComponentInfo,
    AbilityLifecycleStage,
    ComponentLifecycleStage,
    UICallbackInfo,
    LifecycleModelConfig,
    DEFAULT_LIFECYCLE_CONFIG,
} from './LifecycleTypes';

// ============================================================================
// LifecycleModelCreator 类
// ============================================================================

/**
 * 扩展版生命周期模型创建器
 * 
 * 使用方式：
 * ```typescript
 * const scene = ...; // 已构建的 Scene
 * const creator = new LifecycleModelCreator(scene);
 * creator.create();
 * const dummyMain = creator.getDummyMain();
 * ```
 */
export class LifecycleModelCreator {
    // ========================================================================
    // 成员变量
    // ========================================================================
    
    /** 分析场景 */
    private scene: Scene;
    
    /** 配置选项 */
    private config: LifecycleModelConfig;
    
    /** Ability 收集器 */
    private abilityCollector: AbilityCollector;
    
    /** ViewTree 回调提取器 */
    private callbackExtractor: ViewTreeCallbackExtractor;
    
    /** 收集到的所有 Ability */
    private abilities: AbilityInfo[] = [];
    
    /** 收集到的所有 Component */
    private components: ComponentInfo[] = [];
    
    /** 生成的 DummyMain 方法 */
    private dummyMain: ArkMethod = new ArkMethod();
    
    /** 临时变量索引（用于生成唯一名称） */
    private tempLocalIndex: number = 0;
    
    /** 类实例 Local 映射：类签名 -> Local 变量 */
    private classInstanceMap: Map<string, Local> = new Map();

    // ========================================================================
    // 构造函数
    // ========================================================================

    /**
     * 创建 LifecycleModelCreator 实例
     * 
     * @param scene 分析场景
     * @param config 配置选项（可选，使用默认配置）
     */
    constructor(scene: Scene, config?: Partial<LifecycleModelConfig>) {
        this.scene = scene;
        this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
        
        // 初始化收集器
        this.abilityCollector = new AbilityCollector(scene);
        this.callbackExtractor = new ViewTreeCallbackExtractor(scene);
    }

    // ========================================================================
    // 公共 API
    // ========================================================================

    /**
     * 创建扩展版 DummyMain
     * 
     * 这是主入口方法，执行完整的构建流程
     */
    public create(): void {
        console.log('[LifecycleModelCreator] Starting creation...');
        
        // Step 1: 收集所有 Ability 和 Component
        this.collectAbilitiesAndComponents();
        
        // Step 2: 提取 UI 回调（如果启用）
        if (this.config.enableViewTreeParsing) {
            this.extractUICallbacks();
        }
        
        // Step 3: 创建 DummyMain 方法的容器（File、Class）
        this.createDummyMainContainer();
        
        // Step 4: 构建 DummyMain 的 CFG
        this.buildDummyMainCfg();
        
        // Step 5: 注册到 Scene
        this.scene.addToMethodsMap(this.dummyMain);
        
        console.log('[LifecycleModelCreator] Creation completed.');
        this.printSummary();
    }

    /**
     * 获取生成的 DummyMain 方法
     */
    public getDummyMain(): ArkMethod {
        return this.dummyMain;
    }

    /**
     * 获取收集到的 Ability 列表
     */
    public getAbilities(): AbilityInfo[] {
        return this.abilities;
    }

    /**
     * 获取收集到的 Component 列表
     */
    public getComponents(): ComponentInfo[] {
        return this.components;
    }

    // ========================================================================
    // Step 1: 收集 Ability 和 Component
    // ========================================================================

    /**
     * 收集所有 Ability 和 Component
     */
    private collectAbilitiesAndComponents(): void {
        console.log('[LifecycleModelCreator] Collecting Abilities and Components...');
        
        // 收集 Ability
        this.abilities = this.abilityCollector.collectAllAbilities();
        console.log(`  Found ${this.abilities.length} Abilities`);
        
        // 收集 Component
        this.components = this.abilityCollector.collectAllComponents();
        console.log(`  Found ${this.components.length} Components`);
        
        // TODO: 建立 Ability 与 Component 的关联关系
        // 可能需要分析 onWindowStageCreate 中的 loadContent 调用
    }

    // ========================================================================
    // Step 2: 提取 UI 回调
    // ========================================================================

    /**
     * 提取所有 Component 的 UI 回调
     */
    private extractUICallbacks(): void {
        console.log('[LifecycleModelCreator] Extracting UI callbacks from ViewTree...');
        
        this.callbackExtractor.fillAllComponentCallbacks(this.components);
        
        let totalCallbacks = 0;
        for (const component of this.components) {
            totalCallbacks += component.uiCallbacks.length;
        }
        console.log(`  Extracted ${totalCallbacks} UI callbacks`);
    }

    // ========================================================================
    // Step 3: 创建 DummyMain 容器
    // ========================================================================

    /**
     * 创建 DummyMain 方法的容器结构
     * 
     * 创建：
     * - @extendedDummyFile 虚拟文件
     * - @extendedDummyClass 虚拟类
     * - @extendedDummyMain 方法
     */
    private createDummyMainContainer(): void {
        // 创建虚拟文件
        const dummyFile = new ArkFile(Language.JAVASCRIPT);
        dummyFile.setScene(this.scene);
        const fileSignature = new FileSignature(
            this.scene.getProjectName(),
            '@extendedDummyFile'
        );
        dummyFile.setFileSignature(fileSignature);
        this.scene.setFile(dummyFile);
        
        // 创建虚拟类
        const dummyClass = new ArkClass();
        dummyClass.setDeclaringArkFile(dummyFile);
        const classSignature = new ClassSignature(
            '@extendedDummyClass',
            dummyFile.getFileSignature(),
            null
        );
        dummyClass.setSignature(classSignature);
        dummyFile.addArkClass(dummyClass);
        
        // 创建 DummyMain 方法
        this.dummyMain = new ArkMethod();
        this.dummyMain.setDeclaringArkClass(dummyClass);
        const methodSubSignature = ArkSignatureBuilder.buildMethodSubSignatureFromMethodName(
            '@extendedDummyMain'
        );
        const methodSignature = new MethodSignature(
            dummyClass.getSignature(),
            methodSubSignature
        );
        this.dummyMain.setImplementationSignature(methodSignature);
        this.dummyMain.setLineCol(0);
        checkAndUpdateMethod(this.dummyMain, dummyClass);
        dummyClass.addMethod(this.dummyMain);
    }

    // ========================================================================
    // Step 4: 构建 CFG
    // ========================================================================

    /**
     * 构建 DummyMain 的控制流图
     */
    private buildDummyMainCfg(): void {
        const cfg = new Cfg();
        cfg.setDeclaringMethod(this.dummyMain);
        
        // 创建入口基本块
        const entryBlock = new BasicBlock();
        cfg.addBlock(entryBlock);
        
        // 4.1 添加静态初始化
        this.addStaticInitialization(cfg, entryBlock);
        
        // 4.2 创建主循环结构
        const { whileBlock, countLocal } = this.createMainLoopStructure(cfg, entryBlock);
        
        // 4.3 为每个 Ability 添加生命周期调用
        let lastBlocks: BasicBlock[] = [whileBlock];
        let branchCount = 0;
        
        for (const ability of this.abilities) {
            branchCount++;
            lastBlocks = this.addAbilityLifecycleBranch(
                cfg,
                ability,
                lastBlocks,
                countLocal,
                branchCount
            );
        }
        
        // 4.4 为每个 Component 添加生命周期和回调调用
        for (const component of this.components) {
            branchCount++;
            lastBlocks = this.addComponentLifecycleBranch(
                cfg,
                component,
                lastBlocks,
                countLocal,
                branchCount
            );
        }
        
        // 4.5 连接回主循环
        for (const block of lastBlocks) {
            block.addSuccessorBlock(whileBlock);
            whileBlock.addPredecessorBlock(block);
        }
        
        // 4.6 添加返回块
        const returnBlock = this.createReturnBlock(cfg, whileBlock);
        
        // 设置方法体
        const locals = new Set(this.classInstanceMap.values());
        const body = new ArkBody(locals, cfg);
        this.dummyMain.setBody(body);
        
        // 为所有语句设置 CFG 引用
        this.linkStmtsToCfg(cfg);
    }

    /**
     * 添加静态初始化调用
     */
    private addStaticInitialization(cfg: Cfg, entryBlock: BasicBlock): void {
        let isFirst = true;
        
        for (const method of this.scene.getStaticInitMethods()) {
            const invokeExpr = new ArkStaticInvokeExpr(method.getSignature(), []);
            const invokeStmt = new ArkInvokeStmt(invokeExpr);
            
            if (isFirst) {
                cfg.setStartingStmt(invokeStmt);
                isFirst = false;
            }
            
            entryBlock.addStmt(invokeStmt);
        }
        
        // 如果没有静态初始化方法，设置一个占位
        if (isFirst) {
            // 添加一个 count = 0 的语句作为起始
            const countLocal = new Local('count', NumberType.getInstance());
            const zero = ValueUtil.getOrCreateNumberConst(0);
            const assignStmt = new ArkAssignStmt(countLocal, zero);
            cfg.setStartingStmt(assignStmt);
            entryBlock.addStmt(assignStmt);
        }
    }

    /**
     * 创建主循环结构
     */
    private createMainLoopStructure(
        cfg: Cfg,
        entryBlock: BasicBlock
    ): { whileBlock: BasicBlock; countLocal: Local } {
        // 创建计数器变量
        const countLocal = new Local('count', NumberType.getInstance());
        const zero = ValueUtil.getOrCreateNumberConst(0);
        const countAssign = new ArkAssignStmt(countLocal, zero);
        entryBlock.addStmt(countAssign);
        
        // 创建 while(true) 循环块
        const whileBlock = new BasicBlock();
        const trueConst = ValueUtil.getBooleanConstant(true);
        const condition = new ArkConditionExpr(
            trueConst,
            zero,
            RelationalBinaryOperator.Equality
        );
        const whileStmt = new ArkIfStmt(condition);
        whileBlock.addStmt(whileStmt);
        cfg.addBlock(whileBlock);
        
        // 连接入口块到循环块
        entryBlock.addSuccessorBlock(whileBlock);
        whileBlock.addPredecessorBlock(entryBlock);
        
        return { whileBlock, countLocal };
    }

    /**
     * 为单个 Ability 添加生命周期调用分支
     * 
     * @returns 更新后的 lastBlocks
     */
    private addAbilityLifecycleBranch(
        cfg: Cfg,
        ability: AbilityInfo,
        lastBlocks: BasicBlock[],
        countLocal: Local,
        branchIndex: number
    ): BasicBlock[] {
        // 创建条件判断块: if (count == branchIndex)
        const condition = new ArkConditionExpr(
            countLocal,
            new Constant(branchIndex.toString(), NumberType.getInstance()),
            RelationalBinaryOperator.Equality
        );
        const ifStmt = new ArkIfStmt(condition);
        const ifBlock = new BasicBlock();
        ifBlock.addStmt(ifStmt);
        cfg.addBlock(ifBlock);
        
        // 连接前驱块
        for (const block of lastBlocks) {
            ifBlock.addPredecessorBlock(block);
            block.addSuccessorBlock(ifBlock);
        }
        
        // 创建 Ability 调用块
        const invokeBlock = new BasicBlock();
        cfg.addBlock(invokeBlock);
        
        // 获取或创建 Ability 实例
        const abilityLocal = this.getOrCreateClassInstance(ability.arkClass);
        
        // 添加实例化语句
        this.addInstanceCreation(invokeBlock, abilityLocal, ability.arkClass);
        
        // 按顺序调用生命周期方法
        for (const stage of this.config.lifecycleOrder) {
            const lifecycleMethod = ability.lifecycleMethods.get(stage);
            if (lifecycleMethod) {
                this.addMethodInvocation(invokeBlock, abilityLocal, lifecycleMethod);
            }
        }
        
        // 连接 if 块和调用块
        ifBlock.addSuccessorBlock(invokeBlock);
        invokeBlock.addPredecessorBlock(ifBlock);
        
        return [ifBlock, invokeBlock];
    }

    /**
     * 为单个 Component 添加生命周期和回调调用分支
     */
    private addComponentLifecycleBranch(
        cfg: Cfg,
        component: ComponentInfo,
        lastBlocks: BasicBlock[],
        countLocal: Local,
        branchIndex: number
    ): BasicBlock[] {
        // 创建条件判断块
        const condition = new ArkConditionExpr(
            countLocal,
            new Constant(branchIndex.toString(), NumberType.getInstance()),
            RelationalBinaryOperator.Equality
        );
        const ifStmt = new ArkIfStmt(condition);
        const ifBlock = new BasicBlock();
        ifBlock.addStmt(ifStmt);
        cfg.addBlock(ifBlock);
        
        // 连接前驱块
        for (const block of lastBlocks) {
            ifBlock.addPredecessorBlock(block);
            block.addSuccessorBlock(ifBlock);
        }
        
        // 创建调用块
        const invokeBlock = new BasicBlock();
        cfg.addBlock(invokeBlock);
        
        // 获取或创建 Component 实例
        const componentLocal = this.getOrCreateClassInstance(component.arkClass);
        
        // 添加实例化
        this.addInstanceCreation(invokeBlock, componentLocal, component.arkClass);
        
        // 调用 Component 生命周期方法
        const lifecycleOrder: ComponentLifecycleStage[] = [
            ComponentLifecycleStage.ABOUT_TO_APPEAR,
            ComponentLifecycleStage.BUILD,
            ComponentLifecycleStage.PAGE_SHOW,
        ];
        
        for (const stage of lifecycleOrder) {
            const method = component.lifecycleMethods.get(stage);
            if (method) {
                this.addMethodInvocation(invokeBlock, componentLocal, method);
            }
        }
        
        // 调用 UI 回调（精细化版本）
        if (this.config.enableFineGrainedUICallbacks) {
            for (const callback of component.uiCallbacks) {
                this.addUICallbackInvocation(invokeBlock, componentLocal, callback);
            }
        }
        
        // 连接
        ifBlock.addSuccessorBlock(invokeBlock);
        invokeBlock.addPredecessorBlock(ifBlock);
        
        return [ifBlock, invokeBlock];
    }

    /**
     * 创建返回块
     */
    private createReturnBlock(cfg: Cfg, whileBlock: BasicBlock): BasicBlock {
        const returnBlock = new BasicBlock();
        const returnStmt = new ArkReturnVoidStmt();
        returnBlock.addStmt(returnStmt);
        cfg.addBlock(returnBlock);
        
        whileBlock.addSuccessorBlock(returnBlock);
        returnBlock.addPredecessorBlock(whileBlock);
        
        return returnBlock;
    }

    // ========================================================================
    // 辅助方法：语句生成
    // ========================================================================

    /**
     * 获取或创建类实例的 Local 变量
     */
    private getOrCreateClassInstance(arkClass: ArkClass): Local {
        const key = arkClass.getSignature().toString();
        
        if (this.classInstanceMap.has(key)) {
            return this.classInstanceMap.get(key)!;
        }
        
        const local = new Local(
            `%${this.tempLocalIndex++}`,
            new ClassType(arkClass.getSignature())
        );
        this.classInstanceMap.set(key, local);
        
        return local;
    }

    /**
     * 添加类实例化语句
     */
    private addInstanceCreation(
        block: BasicBlock,
        local: Local,
        arkClass: ArkClass
    ): void {
        // local = new ClassName()
        const classType = local.getType() as ClassType;
        const newExpr = new ArkNewExpr(classType);
        const assignStmt = new ArkAssignStmt(local, newExpr);
        block.addStmt(assignStmt);
        local.setDeclaringStmt(assignStmt);
        
        // 调用构造函数
        const constructor = arkClass.getMethodWithName(CONSTRUCTOR_NAME);
        if (constructor) {
            const invokeExpr = new ArkInstanceInvokeExpr(
                local,
                constructor.getSignature(),
                []
            );
            const invokeStmt = new ArkInvokeStmt(invokeExpr);
            block.addStmt(invokeStmt);
        }
    }

    /**
     * 添加方法调用语句
     */
    private addMethodInvocation(
        block: BasicBlock,
        instanceLocal: Local,
        method: ArkMethod
    ): void {
        // TODO: 处理方法参数
        // 当前简化：不传递参数
        const invokeExpr = new ArkInstanceInvokeExpr(
            instanceLocal,
            method.getSignature(),
            []
        );
        const invokeStmt = new ArkInvokeStmt(invokeExpr);
        block.addStmt(invokeStmt);
    }

    /**
     * 添加 UI 回调调用语句
     */
    private addUICallbackInvocation(
        block: BasicBlock,
        componentLocal: Local,
        callback: UICallbackInfo
    ): void {
        // TODO: 实现精细化的 UI 回调调用
        // 当前简化：直接调用回调方法
        //
        // 完整实现思路：
        // 1. 根据 callback.componentType 创建控件实例
        // 2. 调用控件实例的 callback.eventType 方法
        // 3. 传入 callback.callbackMethod 作为参数
        
        if (callback.callbackMethod) {
            const invokeExpr = new ArkInstanceInvokeExpr(
                componentLocal,
                callback.callbackMethod.getSignature(),
                []
            );
            const invokeStmt = new ArkInvokeStmt(invokeExpr);
            block.addStmt(invokeStmt);
        }
    }

    /**
     * 为所有语句设置 CFG 引用
     */
    private linkStmtsToCfg(cfg: Cfg): void {
        for (const block of cfg.getBlocks()) {
            for (const stmt of block.getStmts()) {
                stmt.setCfg(cfg);
            }
        }
    }

    // ========================================================================
    // 调试输出
    // ========================================================================

    /**
     * 打印构建摘要
     */
    private printSummary(): void {
        console.log('\n========== LifecycleModelCreator Summary ==========');
        console.log(`Abilities: ${this.abilities.length}`);
        for (const ability of this.abilities) {
            console.log(`  - ${ability.name} (${ability.lifecycleMethods.size} lifecycle methods)`);
        }
        
        console.log(`Components: ${this.components.length}`);
        for (const component of this.components) {
            console.log(`  - ${component.name} (${component.uiCallbacks.length} UI callbacks)`);
        }
        
        console.log(`DummyMain: ${this.dummyMain.getSignature().toString()}`);
        console.log('===================================================\n');
    }
}
