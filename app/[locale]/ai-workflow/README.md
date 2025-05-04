# AI工作流系统说明文档

## 项目简介

本项目是一个基于React和Next.js开发的AI工作流系统，允许用户通过可视化界面创建、配置和执行AI驱动的自动化工作流。系统支持多种AI模型集成、数据处理和输出格式，使非技术用户也能轻松构建复杂的AI自动化流程。

## 系统架构

系统主要由以下几个部分组成：

1. **工作流编辑器**: 基于React Flow实现的可视化拖拽界面，支持节点连接和布局调整
2. **节点组件**: 
   - WorkflowNode.js - 所有节点类型的基础组件，包含输入、处理和输出节点的逻辑
   - ModelSelector.js - AI模型选择组件，用于处理节点选择AI模型
   - InputForm.js - 动态生成输入表单的组件，用于工作流执行时收集用户输入
3. **工作流执行引擎**: 负责按照设定的流程执行AI任务，处理数据传递和结果输出
4. **状态管理**: 使用React Hooks管理工作流状态、节点配置和执行结果
5. **API交互**: 与后端服务交互，保存/加载工作流、执行AI处理等

## 工作流类型

系统支持多种工作流类型，包括：

- **文档生成**: 根据用户输入自动生成文档内容
- **演示文稿生成**: 自动创建演示文稿（PowerPoint等）
- **API请求处理**: 将AI生成的内容发送到外部API
- **数据分析**: 对输入数据进行AI驱动的分析
- **任务创建**: 自动生成项目任务并分配到相应团队
- **聊天消息发送**: 将AI生成的内容作为消息发送到聊天会话

## 核心功能详解

### 1. 节点类型详情

#### 输入节点(Input)
- **功能**: 收集用户输入的数据
- **配置项**:
  - 输入字段定义（名称、类型、是否必填）
  - 字段描述和默认值
  - 字段验证规则
- **数据类型支持**: 文本、数字、多行文本

#### 处理节点(Process)
- **功能**: 使用AI模型处理数据
- **配置项**:
  - AI模型选择
  - 处理参数和提示语设置
  - 系统指令和上下文配置
- **支持的模型**:
  - Google Gemini 2.0 Flash
  - DeepSeek R1
  - Gemma 3
  - Mistral 7B
  - 以及更多可扩展模型

#### 输出节点(Output)
- **类型**:
  - **JSON输出**: 生成结构化JSON数据
  - **API请求**: 将结果发送到外部API
  - **任务创建**: 在项目管理系统中创建任务
  - **聊天消息**: 发送消息到聊天系统
- **配置项**:
  - 输出格式和模板
  - 目标系统连接设置
  - 错误处理和重试策略

### 2. 节点连接与数据流

数据在节点间的流动遵循以下规则：
- 输入节点 → 处理节点: 传递用户输入数据
- 处理节点 → 输出节点: 传递AI处理结果
- 输出节点之间: 可以级联处理（如JSON输出→API请求）

连接使用React Flow的边缘组件实现，支持：
- 动画流动效果展示数据传递
- 条件分支（根据处理结果选择不同输出路径）
- 多输出节点并行处理

### 3. 工作流保存与加载实现

工作流数据包含以下内容：
- 工作流元数据（名称、描述、类型、创建时间等）
- 节点配置（位置、类型、参数设置等）
- 节点连接关系（边的定义）
- 执行参数和历史记录

保存过程：
1. 收集所有节点和边的数据
2. 序列化为JSON格式
3. 调用API保存到数据库
4. 关联到当前用户账户

加载过程：
1. 获取用户工作流列表
2. 用户选择要加载的工作流
3. 加载工作流配置数据
4. 重建节点和连接关系

### 4. 工作流执行详细流程

执行过程包括：

1. **输入阶段**:
   - 根据输入节点配置生成输入表单
   - 验证用户输入数据
   - 组织数据为处理节点可用格式

2. **处理阶段**:
   - 选择配置的AI模型
   - 构建API请求（包含系统指令、用户输入、参数设置）
   - 发送请求到AI服务
   - 接收AI生成的结果

3. **输出阶段**:
   - 根据输出节点类型处理AI结果
   - JSON输出: 将结果格式化为预定义的JSON结构
   - API输出: 构建HTTP请求发送到目标API
   - 任务输出: 在项目管理系统中创建新任务
   - 聊天输出: 发送消息到选定的聊天会话

4. **执行结果处理**:
   - 显示执行状态和进度
   - 捕获并显示错误信息
   - 保存执行历史记录
   - 展示执行结果预览

## 组件技术实现

### WorkflowNode组件

```javascript
// 核心实现概述:
// - 基于节点类型(nodeType)和输出类型(outputType)渲染不同界面
// - 处理节点拖拽和连接
// - 管理节点配置状态和数据流向
// - 提供编辑界面进行节点配置

// 主要参数:
// - data: 节点配置数据
// - selected: 节点是否被选中
// - id: 节点唯一标识符

// 关键功能:
// - 表单处理和验证
// - 样式根据节点类型动态变化
// - 支持节点配置的实时保存
```

### ModelSelector组件

```javascript
// 核心实现概述:
// - 加载可用的AI模型列表
// - 提供模型选择界面
// - 保存用户选择并通知父组件

// 主要参数:
// - selectedModel: 当前选中的模型ID
// - onModelChange: 模型变更回调函数
// - userId: 当前用户ID(用于加载用户特定模型)

// 模型数据结构:
// - id: 模型唯一标识符
// - name: 模型显示名称
// - description: 模型描述信息
```

### InputForm组件

```javascript
// 核心实现概述:
// - 根据字段配置动态生成表单
// - 处理用户输入和表单验证
// - 提交表单数据到父组件

// 主要参数:
// - fields: 表单字段配置数组
// - onSubmit: 表单提交回调函数
// - isLoading: 是否处于加载状态

// 字段类型支持:
// - text: 单行文本输入
// - textarea: 多行文本输入
// - number: 数字输入
```

## 使用流程详解

### 步骤1: 创建工作流

1. 点击界面上的"New Workflow"按钮
2. 在弹出的表单中填写:
   - 工作流名称(workflowName): 用于标识工作流
   - 工作流描述(workflowDescription): 详细说明工作流用途
   - 工作流类型(workflowType): 从预定义类型中选择
   - 系统提示(workflowPrompt): 可选的全局AI指令

3. 点击"创建"按钮完成初始化
   - 系统自动创建默认节点结构
   - 输入节点 → 处理节点 → 多种输出节点

### 步骤2: 配置节点详情

1. **输入节点配置**:
   - 点击输入节点打开配置面板
   - 使用"+"按钮添加输入字段
   - 为每个字段设置:
     - 字段名称(name): 系统内部使用的标识符
     - 字段标签(label): 用户界面显示的名称
     - 字段类型(type): 文本、多行文本或数字
     - 是否必填(required): 设置为必填或可选
     - 默认值(defaultValue): 可选的预填写值

2. **处理节点配置**:
   - 点击处理节点打开配置面板
   - 从ModelSelector中选择AI模型
   - 配置处理参数:
     - 模型温度(temperature): 控制输出随机性
     - 最大标记数(maxTokens): 限制输出长度
     - 系统指令(systemPrompt): 提供给AI的基础指令

3. **输出节点配置**:
   - 根据输出类型配置不同参数:
     
   - **JSON输出节点**:
     - 定义JSON模板结构
     - 设置字段映射关系
     
   - **API输出节点**:
     - 设置API URL
     - 选择HTTP方法(GET/POST/PUT等)
     - 配置请求头和认证信息
     
   - **任务输出节点**:
     - 选择目标项目和团队
     - 配置任务模板和默认参数
     
   - **聊天输出节点**:
     - 选择目标聊天会话
     - 配置消息模板
     - 设置消息格式(文本/富文本)

### 步骤3: 连接节点

1. 使用鼠标从节点的连接点拖出连接线:
   - 输出连接点(源): 位于节点底部
   - 输入连接点(目标): 位于节点顶部

2. 调整连接关系:
   - 删除不需要的连接: 选中连接线后按Delete键
   - 重新连接: 拖动新的连接线替换原有连接

3. 调整节点位置:
   - 拖动节点到合适位置
   - 使用面板右侧的控制栏调整视图

### 步骤4: 保存工作流

1. 点击工具栏中的"Save"按钮
2. 系统执行以下操作:
   - 收集所有节点数据和连接关系
   - 验证工作流配置完整性
   - 通过API保存到后端数据库
   - 显示成功保存通知

3. 保存后可以:
   - 继续编辑当前工作流
   - 创建新工作流
   - 在工作流列表中管理已保存的工作流

### 步骤5: 执行工作流

1. 点击工具栏中的"Execute"按钮
2. 系统生成基于输入节点配置的表单:
   - 显示所有配置的输入字段
   - 标记必填字段
   - 应用字段验证规则

3. 填写表单并提交:
   - 输入所有必要信息
   - 点击"执行工作流"按钮

4. 执行过程:
   - 显示执行进度指示器
   - 按照节点连接顺序处理数据
   - 在处理节点调用选定的AI模型
   - 将结果传递到输出节点进行处理

5. 查看结果:
   - 执行完成后显示结果摘要
   - 提供查看详细结果的选项
   - 可以下载生成的内容(如JSON数据)
   - 显示执行状态(成功/错误)

## 高级功能详解

### 项目集成详情

任务输出节点的集成机制:
1. **项目和团队选择**:
   - 自动加载用户有权限的项目列表
   - 选择项目后加载相关团队
   - 支持搜索和筛选大型项目列表

2. **任务创建参数**:
   - 标题模板: 支持变量替换 (如 `${content.title}`)
   - 描述模板: 可包含AI生成的详细内容
   - 优先级和截止日期设置
   - 自动分配规则配置

3. **与AI输出映射**:
   - 将AI生成的JSON字段映射到任务属性
   - 支持复杂结构的提取和转换
   - 条件逻辑处理特殊情况

### 聊天集成详情

聊天输出节点的功能:
1. **会话选择**:
   - 加载用户的聊天会话列表
   - 支持多会话选择(群发消息)
   - 会话预览和状态显示

2. **消息配置**:
   - 消息模板编辑器(支持Markdown)
   - 变量插入 (如 `{{content}}`)
   - 富文本格式选项
   - 附件和媒体内容支持

3. **交互选项**:
   - 配置是否允许回复
   - 设置消息通知选项
   - 发送时间安排(立即/定时)

### API集成详情

API输出节点的高级配置:
1. **请求设置**:
   - URL配置(支持变量和环境变量)
   - HTTP方法选择(GET/POST/PUT/DELETE等)
   - 请求头配置(Content-Type, Authorization等)
   - 请求体格式化选项(JSON/Form/XML)

2. **认证方式**:
   - 基本认证(用户名/密码)
   - API密钥认证
   - OAuth集成
   - 自定义认证头部

3. **响应处理**:
   - 成功/错误状态码处理
   - 重试策略配置
   - 响应数据提取和转换
   - 错误日志记录和通知

## 技术实现详解

### 前端架构

本系统使用以下技术栈构建:

- **前端框架**: 
  - React 18+ - 用于构建用户界面
  - Next.js 14 - 服务端渲染和路由
  - @xyflow/react - 可视化工作流编辑器

- **状态管理**: 
  - React Hooks - 组件状态和生命周期
  - useCallback 和 useMemo - 性能优化
  - 自定义hooks用于复杂逻辑

- **UI组件**: 
  - shadcn/ui - 基础UI组件库
  - Lucide React - 图标系统
  - 自定义主题和暗色模式支持

- **图形界面**: 
  - React Flow - 节点绘制和连接管理
  - 拖拽交互和布局管理
  - 节点位置自动计算

- **国际化**: 
  - next-intl - 多语言支持
  - 中英文切换
  - 日期和数字格式本地化

- **API通信**: 
  - Fetch API - 异步数据获取
  - 错误处理和重试机制
  - 请求状态管理

### 节点状态管理

工作流节点状态管理采用以下策略:

1. **状态结构**:
```javascript
// 节点状态示例
{
  id: 'node-1',
  type: 'workflowNode',
  position: { x: 250, y: 100 },
  data: { 
    label: 'Input Node',
    icon: <FileInput size={20} />,
    nodeType: 'input',
    description: 'User input values',
    handleInputChange: () => {},
    inputs: {
      title: {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true
      },
      content: {
        name: 'content',
        label: 'Content',
        type: 'textarea',
        required: true
      }
    }
  }
}
```

2. **状态更新流程**:
   - 使用回调函数传递状态变更
   - 节点配置变更通过工作流页面统一管理
   - 支持撤销/重做操作

### 工作流执行引擎

工作流执行过程的技术实现:

1. **数据流控制**:
```javascript
// 简化的执行流程示例
const executeWorkflow = async (inputs) => {
  // 1. 处理输入数据
  setExecutionStatus('processing');
  setExecutionProgress(10);
  
  try {
    // 2. 查找处理节点
    const processNodes = nodes.filter(n => n.data.nodeType === 'process');
    
    // 3. 为每个处理节点调用AI
    const processResults = await Promise.all(
      processNodes.map(async (node) => {
        const model = node.data.selectedModel;
        return await callAIModel(model, inputs, node.data);
      })
    );
    
    setExecutionProgress(50);
    
    // 4. 将结果传递给输出节点
    const outputNodes = nodes.filter(n => n.data.nodeType === 'output');
    
    // 5. 处理每个输出节点
    const outputResults = await Promise.all(
      outputNodes.map(async (node) => {
        const sourceNodeId = getSourceNodeId(node.id, edges);
        const processResult = processResults.find(r => r.nodeId === sourceNodeId);
        
        if (!processResult) return null;
        
        return await handleOutput(node, processResult.result);
      })
    );
    
    setExecutionProgress(100);
    setExecutionStatus('completed');
    
    // 6. 返回执行结果
    return {
      inputs,
      processResults,
      outputResults,
      status: 'success'
    };
  } catch (error) {
    setExecutionStatus('error');
    console.error('Workflow execution failed:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
};
```

2. **AI模型调用**:
   - 通过API封装不同模型调用
   - 处理响应超时和重试
   - 流式响应支持(用于长文本生成)

## 扩展与自定义指南

### 1. 添加新节点类型

扩展WorkflowNode组件添加新节点类型的步骤:

1. 在WorkflowNode.js中添加新的nodeType条件:
```javascript
// 示例: 添加数据转换节点
if (nodeType === 'transform') {
  // 渲染数据转换节点界面
  nodeContent = (
    <div className="transform-node-content">
      <h3>数据转换</h3>
      <Select
        value={transformType}
        onChange={handleTransformTypeChange}
        options={[
          { value: 'filter', label: '过滤数据' },
          { value: 'map', label: '映射字段' },
          { value: 'aggregate', label: '数据聚合' }
        ]}
      />
      {/* 转换配置界面 */}
    </div>
  );
}
```

2. 在page.js中添加新节点的初始化配置:
```javascript
// 新节点类型的初始配置
const transformNode = {
  id: 'transform_' + Date.now(),
  type: 'workflowNode',
  position: { x: 250, y: 250 },
  data: { 
    label: '数据转换',
    icon: <FilterIcon size={20} />,
    nodeType: 'transform',
    transformType: 'filter',
    description: '转换和处理数据',
    handleInputChange: handleNodeInputChange,
    inputs: {}
  }
};
```

3. 在addNode函数中添加新节点类型的创建逻辑

### 2. 集成新AI模型

通过ModelSelector组件扩展支持新模型:

1. 在ModelSelector.js的defaultModels中添加新模型:
```javascript
const newModel = { 
  id: "openai/gpt-4-turbo:free", 
  name: "GPT-4 Turbo",
  description: "OpenAI最新的高级推理模型" 
};

defaultModels.push(newModel);
```

2. 更新后端API支持新模型调用接口

### 3. 自定义输出格式

扩展输出节点配置支持新格式:

1. 在WorkflowNode.js的outputType中添加新类型:
```javascript
// 示例: 添加CSV输出类型
else if (outputType === 'csv') {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-md">
      <h3 className="text-sm font-medium mb-2">CSV格式配置</h3>
      <div className="space-y-2">
        <div>
          <Label>分隔符</Label>
          <Select
            value={data.csvDelimiter || ','}
            onValueChange={(value) => data.handleInputChange(id, 'csvDelimiter', value)}
            options={[
              { value: ',', label: '逗号 (,)' },
              { value: ';', label: '分号 (;)' },
              { value: '\t', label: '制表符 (Tab)' }
            ]}
          />
        </div>
        <div>
          <Label>包含标题行</Label>
          <Checkbox
            checked={data.csvIncludeHeader || true}
            onCheckedChange={(checked) => data.handleInputChange(id, 'csvIncludeHeader', checked)}
          />
        </div>
        <div>
          <Label>CSV结构定义</Label>
          <Textarea
            value={data.csvStructure || '字段1,字段2,字段3'}
            onChange={(e) => data.handleInputChange(id, 'csvStructure', e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
```

2. 在page.js中添加对新输出类型的处理逻辑

### 4. 扩展处理逻辑

修改工作流执行引擎添加新功能:

1. 在executeWorkflow函数中添加新的处理步骤:
```javascript
// 示例: 添加数据验证步骤
// 在AI处理前验证输入数据
const validateInputs = (inputs) => {
  const validationErrors = {};
  
  // 执行验证规则
  inputNodes.forEach(node => {
    Object.entries(node.data.inputs).forEach(([key, field]) => {
      if (field.required && (!inputs[key] || inputs[key].trim() === '')) {
        validationErrors[key] = `${field.label}是必填项`;
      }
      
      // 自定义验证规则
      if (field.validation && inputs[key]) {
        try {
          const isValid = new Function('value', `return ${field.validation}`)(inputs[key]);
          if (!isValid) {
            validationErrors[key] = field.validationMessage || `${field.label}格式无效`;
          }
        } catch (error) {
          console.error('Validation error:', error);
        }
      }
    });
  });
  
  if (Object.keys(validationErrors).length > 0) {
    throw new Error('输入验证失败: ' + JSON.stringify(validationErrors));
  }
  
  return inputs;
};

// 在执行流程中添加验证
try {
  // 验证输入
  const validatedInputs = validateInputs(inputs);
  
  // 继续执行流程...
} catch (error) {
  // 处理验证错误...
}
```

## 常见问题与解决方案

### 1. 工作流执行超时

**问题**: 复杂工作流执行时出现超时错误。

**解决方案**:
- 分解大型工作流为多个小型工作流
- 调整AI模型参数(降低最大标记数)
- 使用异步执行模式(启用后台任务)
- 配置代码示例:
  ```javascript
  // 配置长时间运行的工作流
  const executeComplexWorkflow = async (inputs) => {
    // 创建后台任务
    const taskId = await createBackgroundTask({
      workflowId: currentWorkflow.id,
      inputs: inputs,
      userId: userId
    });
    
    // 返回任务ID给用户
    return {
      status: 'processing',
      taskId: taskId,
      message: '工作流正在后台执行，完成后将通知您'
    };
  };
  ```

### 2. 节点配置错误

**问题**: 节点配置不正确导致工作流执行失败。

**解决方案**:
- 添加工作流验证功能
- 提供配置检查器和错误提示
- 建议配置实现:
  ```javascript
  // 工作流验证函数
  const validateWorkflow = () => {
    const errors = [];
    
    // 检查输入节点
    const inputNodes = nodes.filter(n => n.data.nodeType === 'input');
    if (inputNodes.length === 0) {
      errors.push('工作流缺少输入节点');
    }
    
    // 检查处理节点
    const processNodes = nodes.filter(n => n.data.nodeType === 'process');
    if (processNodes.length === 0) {
      errors.push('工作流缺少处理节点');
    } else {
      // 检查模型配置
      processNodes.forEach(node => {
        if (!node.data.selectedModel) {
          errors.push(`处理节点 "${node.data.label}" 未选择AI模型`);
        }
      });
    }
    
    // 检查输出节点
    const outputNodes = nodes.filter(n => n.data.nodeType === 'output');
    if (outputNodes.length === 0) {
      errors.push('工作流缺少输出节点');
    }
    
    // 检查连接
    const requiredConnections = [
      { from: 'input', to: 'process', message: '输入节点未连接到处理节点' },
      { from: 'process', to: 'output', message: '处理节点未连接到输出节点' }
    ];
    
    requiredConnections.forEach(({ from, to, message }) => {
      const hasConnection = edges.some(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        return sourceNode?.data.nodeType === from && targetNode?.data.nodeType === to;
      });
      
      if (!hasConnection) {
        errors.push(message);
      }
    });
    
    return errors;
  };
  ```

### 3. API集成故障

**问题**: 与外部API集成时出现连接或授权问题。

**解决方案**:
- 添加API测试功能
- 支持API密钥安全存储
- 实现错误重试机制
- 示例代码:
  ```javascript
  // API连接测试
  const testApiConnection = async (apiUrl, method, headers, body) => {
    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        status: response.status,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };
  ```

## 注意事项与最佳实践

### 工作流设计建议

1. **保持简单**: 
   - 每个工作流专注于单一任务
   - 避免过多节点和复杂连接
   - 分解复杂流程为多个简单工作流

2. **输入设计**:
   - 限制输入字段数量(建议不超过5个)
   - 提供清晰的字段描述和示例
   - 使用适当的字段类型和验证

3. **AI模型选择**:
   - 根据任务复杂度选择合适模型
   - 创意任务使用高温度设置(0.7-0.9)
   - 结构化输出使用低温度设置(0.1-0.3)

4. **输出配置**:
   - 为JSON输出提供清晰的结构模板
   - API请求添加错误处理和重试
   - 任务创建设置合理的默认值

### 性能优化

1. **减少节点数量**: 每个工作流保持在10个节点以内
2. **优化AI请求**: 精简提示词，减少标记数
3. **合并类似功能**: 将相似输出合并到单个节点

### 安全性考虑

1. **敏感数据处理**:
   - 避免在工作流中存储API密钥
   - 使用安全存储服务管理认证信息
   - 审核AI输入防止敏感信息泄露

2. **访问控制**:
   - 工作流共享需谨慎配置权限
   - 敏感工作流添加执行前审批
   - 定期审核工作流访问日志 