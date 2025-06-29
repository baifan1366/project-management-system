//how to check field type
//with the tag table, there is a column called type
//the type is used to check the field type
//the type is TEXT, NUMBER, ID, SINGLE-SELECT, MULTI-SELECT, DATE, PEOPLE, TAGS, FILE

import React from 'react';
import { FileText, File, Sheet, FileCode, X, User, Calendar, Fingerprint, Copy, CheckCheck, Trash, Plus, Edit, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import { fetchTaskById, updateTask } from '@/lib/redux/features/taskSlice';
import TagLabelManager from './TagLabelManager';

/**
 * 检查字段类型并返回类型常量
 * @param {Object} tag - 标签对象
 * @returns {string} 字段类型常量
 */
export function checkFieldType(tag) {
  if (!tag || !tag.type) return 'TEXT'; // 默认为文本类型
  
  // 返回大写的类型
  return tag.type.toUpperCase();
}

//check file
/**
 * 判断字段是否为文件类型
 * @param {Object} tag -.标签对象
 * @returns {boolean} 是否为文件类型
 */
export function isFileType(tag) {
  return checkFieldType(tag) === 'FILE';
}

/**
 * 检查列名是否为文件列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为文件列
 */
export function isFileColumn(tagName) {
  return tagName === 'File' || tagName === '文件';
}

/**
 * 判断文件类型并获取相应图标
 * @param {string} fileName - 文件名
 * @returns {React.ComponentType} 对应文件类型的图标组件
 */
export function getFileIcon(fileName) {
  if (!fileName) return File;
  
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return FileText;
    case 'doc':
    case 'docx':
      return FileText;
    case 'xls':
    case 'xlsx':
      return Sheet;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return FileCode;
    case 'json':
      return FileCode;
    case 'html':
    case 'htm':
      return FileCode;
    case 'css':
    case 'scss':
    case 'less':
      return FileCode;
    case 'csv':
      return Sheet;
    case 'md':
      return FileText;
    default:
      return File;
  }
}

/**
 * 渲染文件单元格内容
 * @param {string} fileName - 文件名
 * @param {Function} onClick - 点击处理函数
 * @returns {JSX.Element} 渲染的文件单元格组件
 */
export function renderFileCell(fileName, onClick) {
  if (!fileName) {
    return (
      <div className="text-muted-foreground text-sm">
        <File className="w-4 h-4 mr-1 inline" />
        <span>No file</span>
      </div>
    );
  }
  
  try {
    // 尝试解析文件名数据
    const parsedFileName = typeof fileName === 'string' ? 
      (fileName.startsWith('{') ? JSON.parse(fileName) : fileName) : 
      fileName;
    
    // 获取显示名称
    const displayName = typeof parsedFileName === 'object' ? 
      (parsedFileName.name || parsedFileName.fileName || 'Unknown file') : 
      String(parsedFileName);
    
    // 获取文件图标组件，确保是正确的组件引用
    const IconComponent = getFileIcon(displayName);
    
    return (
      <a 
        href="#" 
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        onClick={(e) => {
          if (onClick) onClick(e);
          e.preventDefault();
        }}
      >
        <IconComponent className="w-4 h-4" />
        <span className="truncate">{displayName}</span>
      </a>
    );
  } catch (error) {
    console.error('Rendering file cell failed:', error);
    return (
      <div className="text-muted-foreground text-sm">
        <FileText className="w-4 h-4 mr-1 inline" />
        <span>{String(fileName).substring(0, 20)}</span>
      </div>
    );
  }
}

/**
 * 从文件值字符串中解析文件数据
 * @param {string} fileValue - 文件值字符串，格式为 "fileName|fileUrl" 或者 多个文件使用逗号分隔
 * @returns {Array|null} 解析后的文件数据对象数组，每个对象包含fileName和fileUrl
 */
export function parseFileValue(fileValue) {
  if (!fileValue || typeof fileValue !== 'string') return null;
  
  // 检查是否包含多个文件（逗号分隔）
  if (fileValue.includes(',')) {
    const fileEntries = fileValue.split(',');
    return fileEntries.map(entry => parseFileSingle(entry)).filter(Boolean);
  }
  
  // 单个文件解析
  const fileData = parseFileSingle(fileValue);
  return fileData ? [fileData] : null;
}

/**
 * 解析单个文件的数据
 * @param {string} fileEntry - 单个文件条目，格式为 "fileName|fileUrl"
 * @returns {Object|null} 解析后的文件数据对象，包含fileName和fileUrl
 */
function parseFileSingle(fileEntry) {
  if (!fileEntry || typeof fileEntry !== 'string') return null;
  
  const parts = fileEntry.trim().split('|');
  if (parts.length < 2) return null;
  
  return {
    fileName: parts[0],
    fileUrl: parts[1]
  };
}

//check number
/**
 * 检查字段是否为数字类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为数字类型
 */
export function isNumberType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'NUMBER';
  }
  
  // 检查名称是否暗示为数字类型
  if (tag.name) {
    const numericNames = ['number', 'num', '数字', '数值', 'duration', '时长', 'count', '计数',
                          '数量', 'quantity', 'price', '价格', 'amount', '金额'];
    
    return numericNames.some(name => 
      tag.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 检查列名是否为数字列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为数字列
 */
export function isNumberColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称
  if (typeof tagName === 'string' && (
    tagName.toLowerCase() === 'number' || 
    tagName.toLowerCase() === '数字' || 
    tagName.toLowerCase() === 'num' || 
    tagName.toLowerCase() === '数值'
  )) {
    return true;
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'NUMBER') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string' && (
      tagName.name.toLowerCase() === 'number' || 
      tagName.name.toLowerCase() === '数字' || 
      tagName.name.toLowerCase() === 'num' || 
      tagName.name.toLowerCase() === '数值'
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * 渲染数字单元格内容
 * @param {number} value - 数字值
 * @param {Function} onIncrease - 增加数字的处理函数
 * @param {Function} onDecrease - 减少数字的处理函数
 * @param {Function} onChange - 直接修改数字的处理函数
 * @param {Object} options - 选项
 * @returns {JSX.Element} 渲染的数字单元格组件
 */
export function renderNumberCell(value, onIncrease, onDecrease, onChange, options = {}) {
  const { fieldName = '', min = 0, max = 999, step = 1, showAsPercentage = false, readOnly = false } = options;
  
  // 确保value是数字
  const numValue = typeof value === 'number' ? value : Number(value) || 0;
  
  // 验证数字是否在有效范围内
  const isProgress = fieldName.toLowerCase().includes('progress') || 
                     fieldName.toLowerCase().includes('进度');
  
  // 对于progress字段，限制在0-1之间并显示为百分比
  const actualMax = isProgress ? 1 : max;
  const actualStep = isProgress ? 0.1 : step;
  
  // 确保值在范围内
  const safeValue = Math.max(min, Math.min(numValue, actualMax));
  
  // 格式化显示值
  let displayValue;
  if (isProgress) {
    // 显示为百分比
    displayValue = `${Math.round(safeValue * 100)}%`;
  } else {
    // 普通数字格式化
    displayValue = safeValue % 1 !== 0 ? safeValue.toFixed(2) : safeValue;
  }
  
  // 处理增加值
  const handleIncrease = () => {
    const newValue = Math.min(safeValue + actualStep, actualMax);
    if (onIncrease) {
      onIncrease(newValue);
    }
  };
  
  // 处理减少值
  const handleDecrease = () => {
    const newValue = Math.max(safeValue - actualStep, min);
    if (onDecrease) {
      onDecrease(newValue);
    }
  };
  
  return (
    <div className="flex items-center justify-between rounded">
      <button 
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-gray-500 hover:text-primary"
        onClick={handleDecrease}
        aria-label="减少数值"
        disabled={safeValue <= min || readOnly}
      >
        -
      </button>
      <span className="w-12 text-center">{displayValue}</span>
      <button 
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-gray-500 hover:text-primary"
        onClick={handleIncrease}
        aria-label="增加数值"
        disabled={safeValue >= actualMax || readOnly}
      >
        +
      </button>
    </div>
  );
}

/**
 * 验证并格式化数字输入
 * @param {string|number} value - 输入值
 * @param {Object} options - 选项对象
 * @param {number} options.min - 最小允许值
 * @param {number} options.max - 最大允许值
 * @param {number} options.decimalPlaces - 小数位数，若未指定且数字含小数，则默认使用2位小数
 * @returns {number} 格式化后的数字
 */
export function formatNumberValue(value, options = {}) {
  const { 
    decimals = 2, 
    prefix = '', 
    suffix = '',
    useGrouping = true,
    defaultValue = 0,
    allowNegative = true
  } = options;
  
  try {
    // 确保输入转为数字
    let num = Number(value);
    
    // 处理NaN的情况
    if (isNaN(num)) {
      return `${prefix}${defaultValue}${suffix}`;
    }
    
    // 如果不允许负数且值为负数
    if (!allowNegative && num < 0) {
      num = 0;
    }
    
    // 格式化数字
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping
    });
    
    return `${prefix}${formatted}${suffix}`;
  } catch (error) {
    console.error('格式化数字失败:', error);
    return `${prefix}${defaultValue}${suffix}`;
  }
}

//check people
/**
 * 检查字段是否为人员类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为人员类型
 */
export function isPeopleType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'PEOPLE';
  }
  
  // 检查名称是否暗示为人员类型
  if (tag.name) {
    const peopleNames = ['assignee', 'people', 'person', '负责人', '执行者', '人员',
                        'assigned_to', 'assigned to', 'user', 'owner'];
    
    return peopleNames.some(name => 
      tag.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 检查列名是否为人员列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为人员列
 */
export function isPeopleColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称
  if (typeof tagName === 'string' && (
    tagName.toLowerCase() === 'assignee' || 
    tagName.toLowerCase() === '负责人' || 
    tagName.toLowerCase() === 'people' || 
    tagName.toLowerCase() === '人员'
  )) {
    return true;
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'PEOPLE') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string' && (
      tagName.name.toLowerCase() === 'assignee' || 
      tagName.name.toLowerCase() === '负责人' || 
      tagName.name.toLowerCase() === 'people' || 
      tagName.name.toLowerCase() === '人员'
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * 解析用户ID字符串，可能包含多个用户ID（以逗号分隔）
 * @param {string|array|any} userIdStr - 用户ID字符串、数组或其他值
 * @returns {string[]} 用户ID数组
 */
export function parseUserIds(userIdStr) {
  
  // 处理数组情况
  if (Array.isArray(userIdStr)) {
    return userIdStr;
  }
  
  // 如果输入为空或非字符串类型，返回空数组
  if (!userIdStr || typeof userIdStr !== 'string') {
    return [];
  }
  
  // 处理字符串类型的输入
  const ids = userIdStr.split(',').map(id => id.trim()).filter(Boolean);
  return ids;
}

/**
 * 获取用户数据并缓存
 * @param {string|array} userIdStr - 用户ID或逗号分隔的多个用户ID或ID数组
 * @returns {{users: Object[], isLoading: boolean}} 用户数据数组和加载状态
 */
export function useUserData(userIdStr) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [loadedIds, setLoadedIds] = useState([]);
  const reduxUsers = useSelector((state) => state.users.users);
  
  // 解析可能包含多个ID的字符串或数组
  const userIds = parseUserIds(userIdStr);
  
  // 从Redux存储中获取已加载的用户
  const users = userIds
    .map(id => {
      const user = reduxUsers.find(u => u?.id === id);
      return user;
    })
    .filter(Boolean);
  
  // 确定哪些ID尚未加载
  const unloadedIds = userIds.filter(id => 
    !reduxUsers.some(u => u?.id === id) && 
    !loadedIds.includes(id)
  );
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchUsers = async () => {
      if (!userIds.length || !unloadedIds.length) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        // 对每个未加载的ID单独发起请求
        const fetchPromises = unloadedIds.map(userId => {
          return dispatch(fetchUserById(userId)).unwrap()
            .then(result => {
              return result;
            })
            .catch(error => {
              console.error(`获取用户 ${userId} 信息失败:`, error);
              return null;
            });
        });
        
        const results = await Promise.all(fetchPromises);
        
        if (isMounted) {
          // 记录已尝试加载的ID
          setLoadedIds(prev => [...prev, ...unloadedIds]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchUsers();
    
    return () => {
      isMounted = false;
    };
  }, [dispatch, JSON.stringify(userIds)]); // 使用JSON.stringify确保数组变化时触发效果
  
  return { users, isLoading: isLoading && users.length < userIds.length };
}

/**
 * 呈现人员单元格的内容，包括头像和负责人管理功能
 * @param {string} userIdStr - 用户ID或逗号分隔的多个用户ID
 * @param {string} taskId - 任务ID，用于添加/删除负责人
 * @param {string} teamId - 团队ID，用于获取团队成员列表
 * @param {boolean} editable - 是否可编辑（允许添加/删除）
 * @returns {JSX.Element} 渲染的人员单元格组件
 */
export function renderPeopleCell(userIdStr, taskId, teamId, editable = true) {
  const t = useTranslations('Team');
  const dispatch = useDispatch();
  const [userIds, setUserIds] = useState(parseUserIds(userIdStr));
    
  // 添加useEffect监听userIdStr变化
  useEffect(() => {
    setUserIds(parseUserIds(userIdStr));
  }, [userIdStr]);
  
  // 处理添加用户后的操作
  const handleUserAdded = async () => {
    if (taskId) {
      await refreshAssignees();
    }
  };
  
  // 处理移除用户后的操作
  const handleUserRemoved = async () => {
    if (taskId) {
      await refreshAssignees();
    }
  };
  
  // 刷新负责人列表
  const refreshAssignees = async () => {
    try {
      const taskResult = await dispatch(fetchTaskById(taskId)).unwrap();
      
      // 获取最新的负责人列表
      const tagValues = taskResult.tag_values || {};
      const assigneeTagId = 2; // 负责人标签ID
      const updatedUserIds = Array.isArray(tagValues[assigneeTagId]) ? tagValues[assigneeTagId] : [];
      
      // 更新本地状态
      setUserIds(updatedUserIds);
    } catch (error) {
      console.error('刷新负责人列表失败:', error);
    }
  };
  
  // 无论editable设置如何，只要有teamId和taskId，就允许添加和删除负责人
  
  // 如果没有分配用户
  if (!userIds.length) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback>
              <User size={14} />
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground text-sm">{t('unassigned')}</span>
          {/* 始终显示添加用户按钮，无论editable如何 */}
          {taskId && teamId && (
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleUserAdded} 
            />
          )}
        </div>
      </div>
    );
  }
  
  // 如果只有一个用户，显示单个用户
  if (userIds.length === 1) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between w-full">
          <PeopleDisplay userId={userIds[0]} />
          <div className="flex items-center">
          {/* 始终允许删除负责人 */}
          {taskId && (
            <RemoveUserFromAssignee 
              taskId={taskId} 
              userIdToRemove={userIds[0]} 
              onRemoved={handleUserRemoved} 
            />
          )}
          {/* 始终允许添加更多负责人 */}
          {taskId && teamId && (
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleUserAdded} 
            />
          )}
          </div>
        </div>
      </div>
    );
  }
  
  // 显示多个用户
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between w-full">
      <MultipleUsers userIds={userIds} />
      
        {/* 始终显示添加按钮，即使有多个用户 */}
        {taskId && teamId && (
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleUserAdded} 
            />
          )}
        </div>
    </div>
  );
}

/**
 * 集成添加和删除功能的人员单元格渲染
 * @param {Object} props - 组件属性
 * @param {string} props.value - 用户ID或ID数组
 * @param {string} props.taskId - 任务ID
 * @param {string} props.teamId - 团队ID
 * @param {boolean} props.editable - 是否可编辑
 * @returns {JSX.Element} - 渲染的单元格组件
 */
export function EditablePeopleCell({ value, taskId, teamId, editable = true }) {
  const t = useTranslations('Team');
  const dispatch = useDispatch();
  const [userIds, setUserIds] = useState(parseUserIds(value));
  const [open, setOpen] = useState(false);
    
  // 添加useEffect监听value变化
  useEffect(() => {
    setUserIds(parseUserIds(value));
  }, [value]);
  
  // 处理添加用户后的操作
  const handleUserAdded = (userId) => {
    // 刷新任务数据并更新本地状态
    refreshTaskData();
    setOpen(false);
  };
  
  // 处理移除用户后的操作
  const handleUserRemoved = (userId) => {
    // 刷新任务数据并更新本地状态
    refreshTaskData();
  };
  
  // 刷新任务数据
  const refreshTaskData = async () => {
    try {
      // 获取最新的任务信息
      const taskResult = await dispatch(fetchTaskById(taskId)).unwrap();
      
      // 获取最新的负责人列表
      const tagValues = taskResult.tag_values || {};
      const assigneeTagId = 2; // 负责人标签ID
      const updatedUserIds = Array.isArray(tagValues[assigneeTagId]) ? tagValues[assigneeTagId] : [];
      
      // 更新本地状态
      setUserIds(updatedUserIds);
    } catch (error) {
      console.error('获取任务数据失败:', error);
    }
  };
  
  // 如果不需要可编辑功能，直接使用简单显示
  if (!editable) {
    return (
      <div className="flex items-center gap-2">
        {userIds.length ? (
          userIds.length === 1 ? (
            <PeopleDisplay userId={userIds[0]} />
          ) : (
            <MultipleUsers userIds={userIds} />
          )
        ) : (
          <>
            <Avatar className="h-6 w-6">
              <AvatarFallback>
                <User size={14} />
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground text-sm">{t('unassigned')}</span>
          </>
        )}
      </div>
    );
  }
  
  // 可编辑模式 - 显示当前负责人并允许通过Popover管理
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center justify-between w-full p-1 rounded-md hover:bg-accent/50 cursor-pointer">
          {userIds.length ? (
            userIds.length === 1 ? (
              <div className="flex-1">
                <PeopleDisplay userId={userIds[0]} />
              </div>
            ) : (
              <div className="flex-1">
                <MultipleUsers userIds={userIds} />
              </div>
            )
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback>
                  <User size={14} />
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground text-sm">{t('unassigned')}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="ml-auto">
            <User size={16} />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('manage_assignees')}</h4>
          
          {/* 显示当前负责人并允许删除 */}
          {userIds.length > 0 ? (
            <div className="space-y-1 mt-2">
              {userIds.map(userId => (
                <div key={userId} className="flex items-center justify-between p-1 rounded-md hover:bg-accent/50">
                  <PeopleDisplay userId={userId} />
                  <RemoveUserFromAssignee 
                    taskId={taskId} 
                    userIdToRemove={userId} 
                    onRemoved={handleUserRemoved}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-1">{t('no_assignees')}</div>
          )}
          
          {/* 添加负责人按钮 */}
          <div className="mt-2">
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleUserAdded} 
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * 单个人员显示组件，包含Popover效果
 * @param {Object} props - 组件属性
 * @param {string} props.userId - 用户ID
 * @returns {JSX.Element} 人员显示组件
 */
function PeopleDisplay({ userId }) {
  const dispatch = useDispatch();
  const { users, isLoading } = useUserData(userId);
  const user = users[0]; // 单个用户ID只会有一个结果
  
  // 使用useMemo缓存渲染结果，避免不必要的重渲染
  const userInfo = useMemo(() => {
    if (!user) return {
      name: '未知用户',
      email: userId ? `ID: ${userId.substring(0, 8)}...` : '未知ID',
      title: '',
      department: '',
      avatar: null,
      initial: ''
    };
    
    return {
      name: user.name || '未知用户',
      email: user.email || `ID: ${userId.substring(0, 8)}...`,
      title: user.title || '',
      department: user.department || '',
      avatar: user.avatar_url || null,
      initial: user.name?.[0] || ''
    };
  }, [user, userId]);
  
  // 预取用户详细信息
  useEffect(() => {
    // 检查缓存状态
    if (!userId || 
        (userInfoCache.has(userId) && 
        Date.now() - userInfoCache.get(userId).timestamp < USER_CACHE_TIME)
      ) {
      return; // 缓存中有有效数据，不需要预取
    }
    
    // 异步预取用户详情，不阻塞渲染
    dispatch(fetchUserById(userId))
      .unwrap()
      .then(result => {
        if (result) {
          userInfoCache.set(userId, {
            user: result,
            timestamp: Date.now()
          });
        }
      })
      .catch(error => {
        // 静默失败，不影响UI
        
      });
  }, [userId, dispatch]);
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-muted/60 animate-pulse"></div>
        <div className="h-4 w-20 bg-muted/60 animate-pulse rounded"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-muted/60">
            <User size={14} />
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">ID: {userId ? userId.substring(0, 8) : '未知'}</span>
      </div>
    );
  }
  
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 hover:bg-accent p-1 rounded-md transition-colors group">
        <Avatar className="h-7 w-7 transition-transform group-hover:scale-105">
          <AvatarImage src={userInfo.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">{userInfo.initial || <User size={14} />}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">{userInfo.name}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-col">
          <div className="bg-primary/5 p-4 flex items-start gap-4 border-b">
            <Avatar className="h-14 w-14">
            <AvatarImage src={userInfo.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">{userInfo.initial || <User size={24} />}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
              <span className="font-medium text-base">{userInfo.name}</span>
            <span className="text-sm text-muted-foreground">{userInfo.email}</span>
            {userInfo.title && (
                <span className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full w-fit">{userInfo.title}</span>
            )}
          </div>
          </div>
          {userInfo.department && (
            <div className="px-4 py-2 text-sm">
              <span className="text-muted-foreground">部门: </span>
              <span>{userInfo.department}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * 多人员显示组件
 * @param {Object} props - 组件属性
 * @param {string[]} props.userIds - 用户ID数组
 * @returns {JSX.Element} 多人员显示组件
 */
function MultipleUsers({ userIds }) {
  const t = useTranslations('Team');  
  const dispatch = useDispatch();
  const { users, isLoading } = useUserData(userIds);
  const displayCount = 3; // 最多显示3个头像
  
  // 预取所有用户信息
  useEffect(() => {
    if (!userIds.length) return;
    
    // 使用批量预取函数获取用户信息
    // 这不会阻塞组件渲染，但会确保缓存中有完整的用户数据
    prefetchUsersInfo(userIds, dispatch).catch(error => {
      
    });
  }, [JSON.stringify(userIds), dispatch]);
  
  // 优化显示逻辑，防止不必要的渲染
  const userAvatars = useMemo(() => {
    return users.slice(0, displayCount).map((user, idx) => (
      <Avatar 
        key={user?.id || idx} 
        className={`h-7 w-7 border-2 border-background transition-all ${
          idx > 0 ? "group-hover:-translate-x-1" : ""
        }`}
      >
        <AvatarImage src={user?.avatar_url} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {user?.name?.[0] || <User size={14} />}
        </AvatarFallback>
      </Avatar>
    ));
  }, [users]);
  
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1 hover:bg-accent p-1 rounded-md transition-colors group">
        <div className="flex items-center">
          {/* 头像堆叠显示 */}
          <div className="flex -space-x-3 mr-2">
            {userAvatars}
            
            {/* 如果有更多用户，显示额外数量 */}
            {userIds.length > displayCount && (
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background font-medium transition-transform group-hover:-translate-x-1">
                +{userIds.length - displayCount}
              </div>
            )}
            
            {/* 如果还在加载中，显示加载指示器 */}
            {isLoading && users.length === 0 && (
              <div className="h-7 w-7 rounded-full bg-muted animate-pulse border-2 border-background"></div>
            )}
          </div>
          
          {/* 用户数量文本 */}
          <span className="text-sm font-medium">
            {userIds.length > 1 ? 
              `${userIds.length} ${t('users') || '用户'}` : 
              (users[0]?.name || users[0]?.email || '用户')}
          </span>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-0" align="start" side="bottom">
        <div className="p-2">
          <h4 className="text-sm font-medium mb-2 px-2 flex items-center">
            <User size={14} className="mr-1.5 text-primary" />
            {t('assigned_users') || '已分配用户'} 
            <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {userIds.length}
            </span>
          </h4>
          <div className="max-h-60 overflow-y-auto">
            {isLoading && userIds.length > users.length ? (
              <div className="flex items-center justify-center py-2">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-muted-foreground">{t('loading') || '加载中'}</span>
              </div>
            ) : null}
            
            {users.map((user, idx) => (
              <div 
                key={user?.id || idx} 
                className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-md transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {user?.name?.[0] || <User size={14} />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{user?.name || '未知用户'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || (userIds[idx] ? `ID: ${userIds[idx].substring(0, 8)}...` : '未知ID')}</span>
                </div>
              </div>
            ))}
            
            {/* 显示未能加载的用户ID */}
            {userIds.filter(id => !users.some(u => u?.id === id)).map(id => (
              <div key={id} className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-md">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted/60"><User size={14} /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{t('unknown_user') || '未知用户'}</span>
                  <span className="text-xs text-muted-foreground">ID: {id ? id.substring(0, 8) : '未知'}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

//function add assignee
//always show an Plus button
//when clicked, open a popover that show the list of team members that have not yet been assigned to the task
//after assgined, it should be update to the task based on the task id
//find from tag table, tag name is assignee, record down the tag id
//from the task table's tag_values column, find the tag id 
//tag_values is saved as {"1": "task#1", "2": ["userId#1", "userId#2"]}
//if the tag_values does not find the tag id, then add it to the tag_values
//else if found, you should remain the original tag values
//as if originally there is userId#1 saved in the following tag id, you have to continue save the new added assignee to the back
//example: you find tag id of assignee is 2
//then from the tag_values column you get "2"
//then the ["userId#1", "userId#2"] is the assignee
//you have to continue add userId#3 to the back of the array
//so the tag_values should be {"1": "task#1", "2": ["userId#1", "userId#2", "userId#3"]}
/**
 * 从任务中移除指定负责人
 * @param {string} taskId - 任务ID
 * @param {string} userIdToRemove - 需要移除的用户ID
 * @param {Function} onRemoved - 可选的回调函数，当用户成功移除后调用
 * @returns {JSX.Element} - 移除按钮组件
 */
function RemoveUserFromAssignee({ taskId, userIdToRemove, onRemoved }) {
  const dispatch = useDispatch();
  const assigneeTagId = 2; // 负责人标签的ID
  
  // 处理用户移除操作
  const handleRemoveUser = async () => {
    if (!taskId || !userIdToRemove) {
      return;
    }
    
    try {      
      // 获取当前任务信息
      const taskResult = await dispatch(fetchTaskById(taskId)).unwrap();
      
      // 获取当前负责人列表
      const tagValues = taskResult.tag_values || {};
      const currentAssignees = tagValues[assigneeTagId] || [];
            
      // 如果没有找到assignee标签值或者不是数组，则不执行操作
      if (!Array.isArray(currentAssignees)) {
        console.error('负责人数据格式错误', currentAssignees);
        return;
      }
      
      // 移除指定用户ID
      const updatedAssignees = currentAssignees.filter(userId => userId !== userIdToRemove);
      
      // 获取当前所有 tag_values
      const allTagValues = taskResult.tag_values || {};
      
      // 合并更新，保留所有其他字段
      const updatedTagValues = {
        ...allTagValues,
        [assigneeTagId]: updatedAssignees
      };
      
      // 更新任务
      const updatedTask = await dispatch(updateTask({
        taskId: taskId, 
        taskData: {
          tag_values: updatedTagValues
        }
      })).unwrap();
            
      // 如果提供了回调函数，则调用
      if (typeof onRemoved === 'function') {
        onRemoved(userIdToRemove);
      }
      
    } catch (error) {
      console.error('移除负责人失败:', error);
      alert('移除失败: ' + (error.message || '服务器错误'));
    }
  };
  
  return (
    <Button 
      size="icon" 
      variant="ghost" 
      onClick={handleRemoveUser}
      className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
      title="移除负责人"
    >
      <Trash className="w-3.5 h-3.5" />
    </Button>
  );
}

// 1. 创建防抖Hook - 添加到 hooks 文件夹
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// 2. 创建缓存机制 - 全局缓存
const teamMembersCache = new Map();
const CACHE_TIME = 60000; // 缓存1分钟

// 添加全局用户缓存
const userInfoCache = new Map();
const USER_CACHE_TIME = 300000; // 用户信息缓存5分钟

/**
 * 清理过期的用户缓存
 */
export function cleanExpiredUserCache() {
  const now = Date.now();
  for (const [id, data] of userInfoCache.entries()) {
    if (now - data.timestamp >= USER_CACHE_TIME) {
      userInfoCache.delete(id);
    }
  }
}

/**
 * 添加负责人组件
 * @param {Object} props - 组件参数
 * @param {string} props.teamId - 团队ID
 * @param {string} props.taskId - 任务ID
 * @param {Function} props.onAdded - 可选的回调函数，当用户成功添加后调用
 * @returns {JSX.Element} - 添加负责人组件
 */
function AddUserToAssignee({ teamId, taskId, onAdded }) {
  const t = useTranslations('Team');
  const assigneeTagId = 2; // 负责人标签ID
  const dispatch = useDispatch();
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [membersNotYetAssigned, setMembersNotYetAssigned] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchedTeamId, setLastFetchedTeamId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [enrichedMembers, setEnrichedMembers] = useState([]);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 添加防抖搜索
  
  // 使用useEffect进行防抖获取
  useEffect(() => {
    if (!teamId || !taskId) return;
    
    // 如果已经有数据且teamId没变，不重新获取
    if (teamMembers.length > 0 && teamId === lastFetchedTeamId) return;
    
    const fetchTeamData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 检查缓存中是否有最近的数据
        const cacheKey = `team-${teamId}`;
        const cachedData = teamMembersCache.get(cacheKey);
        
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIME)) {
          setTeamMembers(cachedData.users);
          setLastFetchedTeamId(teamId);
          
          // 此处仍需获取任务数据，因为任务数据可能变化
          await fetchTaskData();
          return;
        }
        
        // 没有缓存或缓存过期，获取新数据
        const teamResponse = await dispatch(fetchTeamUsers(teamId)).unwrap();
        
        // 处理响应数据
        let users = extractUsers(teamResponse);
        
        // 将数据存入缓存
        teamMembersCache.set(cacheKey, {
          users,
          timestamp: Date.now()
        });
        
        setTeamMembers(users);
        setLastFetchedTeamId(teamId);
        
        // 获取任务数据
        await fetchTaskData(users);
      } catch (err) {
        console.error("获取团队成员失败:", err);
        setError(err.message || "无法加载团队成员");
      } finally {
        setIsLoading(false);
      }
    };
    
    // 抽取任务数据获取逻辑为单独函数
    const fetchTaskData = async (users = teamMembers) => {
      try {
        const taskResponse = await dispatch(fetchTaskById(taskId)).unwrap();
        
        // 处理任务数据...
        const tagValues = taskResponse?.tag_values || {};
        const currentAssignees = Array.isArray(tagValues[assigneeTagId]) ? tagValues[assigneeTagId] : [];
        setAssignedMembers(currentAssignees);
        
        // 计算未分配成员
        const notYetAssigned = users.filter(member => !currentAssignees.includes(member.user_id));
        setMembersNotYetAssigned(notYetAssigned);
      } catch (err) {
        console.error("获取任务数据失败:", err);
        setError(err.message || "无法加载任务信息");
      }
    };
    
    // 创建防抖
    const debounceTimer = setTimeout(fetchTeamData, 300);
    return () => clearTimeout(debounceTimer);
    
  }, [teamId, taskId, dispatch]);
  
  // 获取团队成员后，再获取每个成员的详细信息
  useEffect(() => {
    if (!teamMembers.length) return;
    
    const fetchDetailedUserInfo = async () => {
      setLoadingUserDetails(true);
      
      try {
        const enrichedData = await Promise.all(
          teamMembers.map(async (member) => {
            try {
              // 获取用户详细信息
              const userResult = await dispatch(fetchUserById(member.user_id)).unwrap();
              return {
                ...member,
                name: userResult.name || member.name,
                email: userResult.email || member.email,
                avatar_url: userResult.avatar_url || member.avatar_url
              };
            } catch (error) {
              console.error(`获取用户${member.user_id}详情失败:`, error);
              return member; // 返回原始成员信息
            }
          })
        );
        
        setEnrichedMembers(enrichedData);
      } catch (error) {
        console.error("获取用户详情失败:", error);
      } finally {
        setLoadingUserDetails(false);
      }
    };
    
    fetchDetailedUserInfo();
  }, [teamMembers, dispatch]);
  
  // 提取用户数据的辅助函数
  function extractUsers(response) {
    if (Array.isArray(response)) return response;
    if (response?.payload && Array.isArray(response.payload)) return response.payload;
    if (response?.users && Array.isArray(response.users)) return response.users;
    if (response && typeof response === 'object') {
      const arrayProp = Object.values(response).find(value => Array.isArray(value));
      if (arrayProp) return arrayProp;
    }
    return [];
  }
  
  // 处理添加负责人操作
  const handleAddUserToAssignee = async (userId) => {
    if (!userId || !taskId) {
      return;
    }
    
    try {      
      // 先获取最新的任务信息，确保有最新的tag_values
      const taskResponse = await dispatch(fetchTaskById(taskId)).unwrap();
      const currentTagValues = taskResponse?.tag_values || {};
      
      // 添加新用户ID到现有负责人列表
      const currentAssignees = Array.isArray(currentTagValues[assigneeTagId]) 
        ? currentTagValues[assigneeTagId] 
        : [];
      const updatedAssignees = [...currentAssignees, userId];
      
      // 合并更新后的tag_values，保留其他字段
      const updatedTagValues = {
        ...currentTagValues,
        [assigneeTagId]: updatedAssignees
      };
      
      // 更新任务
      const result = await dispatch(updateTask({
        taskId: taskId, 
        taskData: {
          tag_values: updatedTagValues
        }
      })).unwrap();
      
      
      // 更新本地状态
      setAssignedMembers(updatedAssignees);
      
      // 更新未分配成员列表
      setMembersNotYetAssigned(prev => 
        prev.filter(member => member.user_id !== userId)
      );
      
      // 如果提供了回调函数，则调用
      if (typeof onAdded === 'function') {
        onAdded(userId);
      }
      
    } catch (error) {
      console.error('添加负责人失败:', error);
      alert('添加失败: ' + (error.message || '服务器错误'));
    }
  };

  // 处理移除负责人操作
  const handleRemoveUserFromAssignee = async (userIdToRemove) => {
    if (!userIdToRemove || !taskId) {
      return;
    }
    
    try {      
      // 获取当前任务信息
      const taskResult = await dispatch(fetchTaskById(taskId)).unwrap();
      
      // 获取当前负责人列表
      const tagValues = taskResult.tag_values || {};
      const currentAssignees = tagValues[assigneeTagId] || [];
            
      // 如果没有找到assignee标签值或者不是数组，则不执行操作
      if (!Array.isArray(currentAssignees)) {
        console.error('负责人数据格式错误', currentAssignees);
        return;
      }
      
      // 移除指定用户ID
      const updatedAssignees = currentAssignees.filter(userId => userId !== userIdToRemove);
      
      // 获取当前所有 tag_values
      const allTagValues = taskResult.tag_values || {};
      
      // 合并更新，保留所有其他字段
      const updatedTagValues = {
        ...allTagValues,
        [assigneeTagId]: updatedAssignees
      };
      
      // 更新任务
      const updatedTask = await dispatch(updateTask({
        taskId: taskId, 
        taskData: {
          tag_values: updatedTagValues
        }
      })).unwrap();
      
      // 更新本地状态
      setAssignedMembers(updatedAssignees);
      
      // 更新未分配成员列表
      const userToAdd = teamMembers.find(member => member.user_id === userIdToRemove);
      if (userToAdd) {
        setMembersNotYetAssigned(prev => [...prev, userToAdd]);
      }
      
      // 如果提供了回调函数，则调用
      if (typeof onAdded === 'function') {
        onAdded(userIdToRemove);
      }
      
    } catch (error) {
      console.error('移除负责人失败:', error);
      alert('移除失败: ' + (error.message || '服务器错误'));
    }
  };

  // 过滤团队成员 - 使用防抖后的搜索词
  const filteredTeamMembers = useMemo(() => {
    return enrichedMembers.filter(member => {
      const memberName = member.name?.toLowerCase() || '';
      const memberEmail = member.email?.toLowerCase() || '';
      // 添加默认值，防止debouncedSearchTerm为undefined
      const search = (debouncedSearchTerm || '').toLowerCase();
      return memberName.includes(search) || 
             memberEmail.includes(search) || 
             member.user_id.toLowerCase().includes(search);
    });
  }, [enrichedMembers, debouncedSearchTerm]);
  
  // 检查用户是否已被分配
  const isUserAssigned = (userId) => {
    return assignedMembers.includes(userId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary"
        title={t('add_assignee') || '添加负责人'}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium flex items-center">
            <User size={14} className="mr-1.5 text-primary" /> 
            {t('manage_assignees') || '管理负责人'}
          </h4>
        </div>
          
        {/* 搜索框 */}
        <div className="mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchMembers') || '搜索团队成员...'}
            className="w-full p-2 border rounded text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-muted-foreground">{t('loading') || '加载中...'}</span>
          </div>
        ) : error ? (
          <div className="text-center py-2 text-sm text-destructive">
            {error}
          </div>
        ) : filteredTeamMembers.length > 0 ? (
          <div className="max-h-60 overflow-y-auto">
            {filteredTeamMembers.map(member => {
              const isAssigned = isUserAssigned(member.user_id);
              return (
                <div 
                  key={member.user_id} 
                  className={`flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer transition-colors ${
                    isAssigned ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => isAssigned 
                    ? handleRemoveUserFromAssignee(member.user_id)
                    : handleAddUserToAssignee(member.user_id)
                  }
                >
                  <Avatar className="h-8 w-8 relative">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {member.name?.[0] || <User size={14} />}
                    </AvatarFallback>
                    {isAssigned && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center">
                        <CheckCheck size={12} />
                      </div>
                    )}
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{member.name || member.user_id}</span>
                    <span className="text-xs text-muted-foreground">{member.email || `ID: ${member.user_id.substring(0, 8)}...`}</span>
                  </div>
                  {isAssigned ? (
                    <CheckCheck size={16} className="ml-auto text-muted-foreground" />
                  ) : (
                    <Plus size={16} className="ml-auto text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-5 text-sm text-muted-foreground flex flex-col items-center">
            {searchTerm 
              ? (t('no_matching_members') || '没有匹配的团队成员') 
              : (t('no_available_members') || '没有团队成员')}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * 显示负责人管理组件，包含添加和移除功能
 * @param {string} teamId - 团队ID
 * @param {string} taskId - 任务ID
 * @returns {JSX.Element} - 负责人管理组件
 */
export function AssigneeManager({ teamId, taskId }) {
  const t = useTranslations('Team');
  const dispatch = useDispatch();
  const [assignees, setAssignees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const assigneeTagId = 2; // 负责人标签ID
    
  // 加载当前任务负责人
  useEffect(() => {
    const loadAssignees = async () => {
      if (!taskId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // 获取任务信息
        const taskAction = await dispatch(fetchTaskById(taskId));
        const taskData = taskAction.payload || {};
        
        // 获取任务中的负责人ID列表
        const tagValues = taskData.tag_values || {};
        const assigneeValues = tagValues[assigneeTagId] || [];
        
        // 确保assigneeValues是数组
        const assigneeArray = Array.isArray(assigneeValues) ? assigneeValues : [];
        setAssignees(assigneeArray);
      } catch (error) {
        console.error('加载负责人失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAssignees();
    
    // 添加lastRefreshTime作为依赖项，当它变化时重新加载数据
  }, [dispatch, taskId, lastRefreshTime]);
  
  // 处理移除负责人的回调
  const handleRemoveAssignee = () => {
    // 触发刷新
    setLastRefreshTime(Date.now());
  };
  
  // 处理添加负责人的回调
  const handleAddAssignee = () => {
    // 触发刷新
    setLastRefreshTime(Date.now());
  };
  
  // 手动刷新函数
  const forceRefresh = () => {
    setLastRefreshTime(Date.now());
  };
  
  // 渲染负责人列表和管理控件
  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-muted-foreground">{t('loading') || '加载中...'}</span>
        </div>
      ) : (
        <>
          {/* 当前负责人列表 */}
          {assignees.length > 0 ? (
            <div className="space-y-1">
              {assignees.length > 1 ? (
                <div className="flex items-center justify-between p-1 rounded-md hover:bg-accent/50 group">
                  <MultipleUsers userIds={assignees} />
                  <AddUserToAssignee 
                    teamId={teamId} 
                    taskId={taskId} 
                    onAdded={handleAddAssignee}
                  />
                </div>
              ) : (
                assignees.map(userId => (
                <div key={userId} className="flex items-center justify-between p-1 rounded-md hover:bg-accent/50 group">
                  <PeopleDisplay userId={userId} />
                    <div className="flex items-center gap-1">
                  <RemoveUserFromAssignee 
                    taskId={taskId} 
                    userIdToRemove={userId} 
                    onRemoved={handleRemoveAssignee}
                  />
                      <AddUserToAssignee 
                        teamId={teamId} 
                        taskId={taskId} 
                        onAdded={handleAddAssignee}
                      />
                </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-1 rounded-md hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-muted/60">
                    <User size={14} />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{t('unassigned') || '未分配'}</span>
            </div>
          
          {/* 添加负责人按钮 */}
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleAddAssignee}
            />
          </div>
          )}
        </>
      )}
    </div>
  );
}

//check date
/**
 * 检查字段是否为日期类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为日期类型
 */
export function isDateType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'DATE';
  }
  
  // 检查名称是否暗示为日期类型
  if (tag.name) {
    const dateNames = ['date', 'day', 'time', '日期', '时间', 'deadline', '截止日期', 'due', 
                      'start date', '开始日期', 'end date', '结束日期'];
    
    return dateNames.some(name => 
      tag.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 检查列名是否为日期列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为日期列
 */
export function isDateColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称
  if (typeof tagName === 'string' && (
    tagName.toLowerCase() === 'date' || 
    tagName.toLowerCase() === '日期' || 
    tagName.toLowerCase() === 'deadline' || 
    tagName.toLowerCase() === '截止日期'
  )) {
    return true;
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'DATE') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string' && (
      tagName.name.toLowerCase() === 'date' || 
      tagName.name.toLowerCase() === '日期' || 
      tagName.name.toLowerCase() === 'deadline' || 
      tagName.name.toLowerCase() === '截止日期'
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * 格式化日期显示
 * @param {string} dateValue - 日期字符串
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的日期字符串
 */
export function formatDateDisplay(dateValue, options = {}) {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return dateValue; // 如果解析失败，返回原始字符串
    }
    
    // 获取本地化格式
    const locale = options.locale || 'zh-CN';
    
    // 默认格式：年-月-日
    const dateOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options.dateOptions
    };
    
    return date.toLocaleDateString(locale, dateOptions);
  } catch (error) {
    console.error('日期格式化错误:', error);
    return dateValue;
  }
}

/**
 * 渲染日期单元格内容
 * @param {string} dateValue - 日期值
 * @param {Function} onChange - 日期修改处理函数
 * @returns {JSX.Element} 渲染的日期单元格组件
 */
export function renderDateCell(dateValue, onChange) {
  const t = useTranslations('Team');
  const formattedDate = formatDateDisplay(dateValue);
  
  // 获取今天的日期，格式为YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // 日期验证函数，确保不能选择今天之前的日期
  const validateDate = (selectedDate) => {
    if (!selectedDate) return true; // 允许清空日期
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0); // 重置时间部分
    
    const current = new Date();
    current.setHours(0, 0, 0, 0); // 重置时间部分
    
    return selected >= current; // 只有当选择的日期大于等于今天时返回true
  };
  
  // 处理日期变更
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    
    if (validateDate(newDate)) {
      // 日期有效，调用onChange
      if (onChange) {
        onChange(newDate);
      }
    } else {
      // 日期无效，显示警告
      alert(t('dateInPastError') || '不能选择今天之前的日期');
      
      // 如果当前已有有效日期，保持不变；否则清空
      if (onChange && !validateDate(dateValue)) {
        onChange('');
      }
    }
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 hover:bg-accent p-1 rounded-md transition-colors cursor-pointer">
          <Calendar size={16} className="text-muted-foreground" />
          <span className="text-sm">{formattedDate || t('noDate')}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-2">
          <input 
            type="date" 
            value={dateValue ? new Date(dateValue).toISOString().split('T')[0] : ''} 
            onChange={handleDateChange}
            min={today} // 设置最小日期为今天
            className="p-2 border rounded"
          />
          {dateValue && (
            <Button 
              variant="ghost" 
              size="sm"
              className="mt-2 text-destructive hover:text-destructive"
              onClick={() => onChange && onChange('')}
            >
              {t('clear')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

//check id
/**
 * 检查字段是否为ID类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为ID类型
 */
export function isIdType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'ID';
  }
  
  // 检查名称是否暗示为ID类型
  if (tag.name) {
    const idNames = ['id', 'identifier', '编号', '标识符', 'uuid', 'key', '主键'];
    
    return idNames.some(name => 
      tag.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 检查列名是否为ID列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为ID列
 */
export function isIdColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称
  if (typeof tagName === 'string' && (
    tagName.toLowerCase() === 'id' || 
    tagName.toLowerCase() === '编号' || 
    tagName.toLowerCase() === 'identifier' || 
    tagName.toLowerCase() === '标识符'
  )) {
    return true;
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'ID') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string' && (
      tagName.name.toLowerCase() === 'id' || 
      tagName.name.toLowerCase() === '编号' || 
      tagName.name.toLowerCase() === 'identifier' || 
      tagName.name.toLowerCase() === '标识符'
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * 格式化ID值显示
 * @param {string} idValue - ID值
 * @param {Object} options - 选项对象
 * @param {boolean} options.truncate - 是否截断显示
 * @param {number} options.maxLength - 截断后的最大长度
 * @returns {string} 格式化后的ID
 */
export function formatIdValue(idValue, options = {}) {
  if (!idValue) return '';
  
  const { truncate = true, maxLength = 8 } = options;
  
  // 如果需要截断显示
  if (truncate && idValue.length > maxLength) {
    return `${idValue.substring(0, maxLength)}...`;
  }
  
  return idValue;
}

/**
 * 渲染ID单元格内容
 * @param {string} idValue - ID值
 * @returns {JSX.Element} 渲染的ID单元格组件
 */
export function renderIdCell(idValue) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('Team');
  
  // 格式化ID显示
  const displayValue = formatIdValue(idValue);
  
  // 根据ID生成稳定的颜色
  const generateColorFromId = (id) => {
    if (!id) return '#6e6e6e'; // 默认灰色
    
    // 简单的哈希算法，将字符串转换为数字
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0; // 转换为32位整数
    }
    
    // 将哈希值转换为HSL颜色
    // 使用固定的饱和度和亮度，只改变色相，确保颜色适合文本背景
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };
  
  // 获取ID的背景颜色
  const bgColor = generateColorFromId(idValue);
  
  // 计算适合背景的文本颜色（深色背景用白色文本，浅色背景用黑色文本）
  const getTextColor = (bgColor) => {
    // 简单的算法来确定背景是深色还是浅色
    // HSL的亮度已固定为85%，所以我们知道这是浅色背景
    return 'hsl(0, 0%, 20%)'; // 深灰色文本
  };
  
  const textColor = getTextColor(bgColor);
  
  // 复制ID到剪贴板的函数
  const copyToClipboard = (e) => {
    e.stopPropagation();
    if (!idValue) return;
    
    navigator.clipboard.writeText(idValue)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // 2秒后恢复未复制状态
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };
  
  // 如果没有ID值，则显示空状态
  if (!idValue) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Fingerprint size={14} />
        <span className="text-xs">{t('noID') || '无ID'}</span>
      </div>
    );
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div 
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:shadow-sm transition-all duration-200 cursor-pointer"
          style={{ 
            backgroundColor: bgColor,
            color: textColor,
            border: `1px solid ${bgColor}`
          }}
        >
          <Fingerprint size={14} className="flex-shrink-0" />
          <span className="text-xs font-mono truncate max-w-[120px]">{displayValue}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{t('identifier') || 'ID'}</h4>
            <div 
              className="cursor-pointer text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-accent transition-colors"
              onClick={copyToClipboard}
            >
              {copied ? 
                <CheckCheck size={16} className="text-green-500" /> : 
                <Copy size={16} />
              }
            </div>
          </div>
          <div className="flex items-center">
            <div 
              className="px-2 py-1 rounded-md w-full text-center"
              style={{ 
                backgroundColor: `${bgColor}50`, // 减少透明度的背景色
                color: textColor,
                border: `1px solid ${bgColor}`
              }}
            >
              <span className="font-mono text-sm break-all">{idValue}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            {copied ? (t('copied') || '已复制到剪贴板') : (t('clickToCopy') || '点击复制完整ID')}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

//check SINGLE-SELECT
/**
 * 检查字段是否为单选类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为单选类型
 */
export function isSingleSelectType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'SINGLE-SELECT';
  }
  
  // 检查名称是否暗示为单选类型
  if (tag.name) {
    const selectNames = ['status', 'state', '状态', 'priority', '优先级', 'category', '类别', 'type', '类型'];
    
    return selectNames.some(name => 
      tag.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 检查列名是否为单选列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为单选列
 */
export function isSingleSelectColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称
  if (typeof tagName === 'string' && (
    tagName.toLowerCase() === 'status' || 
    tagName.toLowerCase() === '状态' || 
    tagName.toLowerCase() === 'priority' || 
    tagName.toLowerCase() === '优先级'
  )) {
    return true;
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'SINGLE-SELECT') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string' && (
      tagName.name.toLowerCase() === 'status' || 
      tagName.name.toLowerCase() === '状态' || 
      tagName.name.toLowerCase() === 'priority' || 
      tagName.name.toLowerCase() === '优先级'
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * 解析单选值
 * @param {string|Object} value - 单选值
 * @returns {Object} 解析后的单选选项对象
 */
export function parseSingleSelectValue(value) {
  // 如果值为空，返回null
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  try {
    // 如果值是字符串，尝试解析为JSON
    if (typeof value === 'string') {
      // 处理空字符串
      if (value.trim() === '') {
        return null;
      }
      
      try {
        const parsed = JSON.parse(value);
        
        // 验证解析后的对象格式是否符合预期
        if (parsed && typeof parsed === 'object') {
          // 确保返回的对象有必要的属性
          return {
            label: parsed.label || '',
            value: parsed.value || parsed.label?.toLowerCase().replace(/\s+/g, '_') || '',
            color: parsed.color || '#10b981'
          };
        }
        // 如果解析后不是对象，将其作为label使用
        return {
          label: String(parsed),
          value: String(parsed).toLowerCase().replace(/\s+/g, '_'),
          color: '#10b981'
        };
      } catch (e) {
        // 如果不能解析为JSON，则直接使用字符串值
        return {
          label: value,
          value: value.toLowerCase().replace(/\s+/g, '_'),
          color: '#10b981'
        };
      }
    }
    
    // 如果值已经是对象
    if (typeof value === 'object') {
      // 确保返回的对象有必要的属性
      return {
        label: value.label || '',
        value: value.value || value.label?.toLowerCase().replace(/\s+/g, '_') || '',
        color: value.color || '#10b981'
      };
    }
    
    // 其他类型转换为字符串
    const strValue = String(value);
    return {
      label: strValue,
      value: strValue.toLowerCase().replace(/\s+/g, '_'),
      color: '#10b981'
    };
  } catch (error) {
    console.error('解析单选值失败:', error);
    return null;
  }
}

/**
 * 从标签生成颜色
 * @param {string} label - 选项标签
 * @returns {string} 颜色十六进制值
 */
function generateColorFromLabel(label) {
  if (!label) return '#e5e5e5'; // 默认灰色
  
  // 简单的哈希算法
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash) + label.charCodeAt(i);
    hash |= 0; // 转换为32位整数
  }
  
  // 预定义的安全颜色列表
  const colors = [
    '#ef4444', // 红色
    '#f97316', // 橙色
    '#f59e0b', // 琥珀色
    '#84cc16', // 酸橙色
    '#10b981', // 绿色
    '#06b6d4', // 青色
    '#3b82f6', // 蓝色
    '#8b5cf6', // 紫色
    '#d946ef', // 洋红色
    '#ec4899'  // 粉色
  ];
  
  // 使用哈希值来选择颜色
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

/**
 * 获取适合背景颜色的文本颜色
 * @param {string} backgroundColor - 背景颜色
 * @returns {string} 文本颜色（黑色或白色）
 */
function getContrastTextColor(backgroundColor) {
  // 转换十六进制颜色为RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 亮度大于125返回黑色文本，否则返回白色文本
  return brightness > 125 ? '#000000' : '#ffffff';
}

/**
 * 渲染单选单元格内容
 * @param {string|Object} value - 单选值
 * @param {Array} options - 可选的选项列表
 * @param {Function} onChange - 选择修改处理函数
 * @param {Function} onCreateOption - 创建新选项处理函数
 * @param {Function} onEditOption - 编辑选项处理函数
 * @param {Function} onDeleteOption - 删除选项处理函数
 * @param {string} teamId - 团队ID
 * @returns {JSX.Element} 渲染的单选单元格组件
 */
export function renderSingleSelectCell(value, options = [], onChange, onCreateOption, onEditOption, onDeleteOption, teamId) {
  
  
  // 如果提供了CRUD操作函数，使用增强版组件
  if (onCreateOption || onEditOption || onDeleteOption) {
    return (
      <EnhancedSingleSelect
        value={value}
        options={options}
        onChange={onChange}
        teamId={teamId || null} // 添加teamId参数
        tagId={null} // 在单元格内不需要tagId
        onCreateOption={onCreateOption}
        onEditOption={onEditOption}
        onDeleteOption={onDeleteOption}
      />
    );
  }
  
  // 否则使用原始实现（向后兼容）
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newOption, setNewOption] = useState({ label: '', color: '#10b981' });
  const [editingOption, setEditingOption] = useState(null);
  
  // 解析当前选择的值
  const selectedOption = parseSingleSelectValue(value);
  
  // 过滤选项
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 处理选项选择
  const handleSelect = (option) => {
    if (onChange) {
      onChange(option);
    }
    setOpen(false);
    setSearchTerm('');
  };
  
  // 创建新选项
  const handleCreateOption = () => {
    if (onCreateOption && newOption.label.trim()) {
      onCreateOption(newOption);
      setNewOption({ label: '', color: '#10b981' });
      setIsCreating(false);
    }
  };
  
  // 编辑选项
  const handleEditOption = () => {
    if (onEditOption && editingOption) {
      onEditOption(editingOption);
      setEditingOption(null);
    }
  };
  
  // 删除选项
  const handleDeleteOption = (option, e) => {
    e.stopPropagation();
    if (onDeleteOption) {
      onDeleteOption(option);
    }
  };
  
  // 开始编辑选项
  const startEditOption = (option, e) => {
    e.stopPropagation();
    setEditingOption({...option});
  };
  
  // 生成随机颜色
  const generateRandomColor = () => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
      '#d946ef', '#ec4899'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 hover:bg-accent p-1 rounded-md transition-colors cursor-pointer">
          {selectedOption ? (
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: selectedOption.color || '#e5e5e5' }}
              ></div>
              <span className="text-sm truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{t('selectOption')}</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2">
          {/* 搜索输入框 */}
          <div className="mb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchOptions')}
              className="w-full p-2 border rounded text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* 选项列表 */}
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-2 hover:bg-accent/50 rounded-md cursor-pointer ${
                    selectedOption && selectedOption.value === option.value ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: option.color || '#e5e5e5' }}
                    ></div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                  
                  {/* 选项编辑按钮 */}
                  {onEditOption && onDeleteOption && (
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => startEditOption(option, e)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteOption(option, e)}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">
                {searchTerm ? t('noMatchingOptions') : t('noOptions')}
              </div>
            )}
          </div>
          
          {/* 添加新选项按钮 */}
          {onCreateOption && (
            <div className="mt-2 border-t pt-2">
              {isCreating ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newOption.label}
                    onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                    placeholder={t('newOptionName')}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="color"
                        value={newOption.color}
                        onChange={(e) => setNewOption({...newOption, color: e.target.value})}
                        className="w-full h-8"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewOption({...newOption, color: generateRandomColor()})}
                      className="h-8"
                    >
                      🎲
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false);
                        setNewOption({ label: '', color: '#10b981' });
                      }}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateOption}
                      disabled={!newOption.label.trim()}
                    >
                      {t('create')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={16} className="mr-1" />
                  {t('addOption')}
                </Button>
              )}
            </div>
          )}
          
          {/* 编辑选项界面 */}
          {editingOption && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingOption(null)}>
              <div className="bg-background p-4 rounded-lg shadow-lg w-72" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-medium mb-4">{t('editOption')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('optionName')}</label>
                    <input
                      type="text"
                      value={editingOption.label}
                      onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('optionColor')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingOption.color}
                        onChange={(e) => setEditingOption({...editingOption, color: e.target.value})}
                        className="w-full h-8"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingOption({...editingOption, color: generateRandomColor()})}
                        className="h-8"
                      >
                        🎲
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingOption(null)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleEditOption}
                      disabled={!editingOption.label.trim()}
                    >
                      {t('save')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * 创建自定义选项样式
 * @param {Object} option - 选项对象
 * @returns {JSX.Element} 样式化的选项组件
 */
export function renderCustomSelectOption(option) {
  // 确保选项有颜色
  const color = option.color || '#e5e5e5';
  const textColor = getContrastTextColor(color);
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded transition-colors">
      <div 
        className="px-2 py-1 rounded text-xs font-medium"
        style={{ 
          backgroundColor: color,
          color: textColor
        }}
      >
        {option.label}
      </div>
    </div>
  );
}

/**
 * 渲染状态选项标签
 * @param {Object} option - 选项对象
 * @returns {JSX.Element} 状态标签组件
 */
export function renderStatusBadge(option) {
  if (!option) return null;
  
  const color = option.color || '#e5e5e5';
  const textColor = getContrastTextColor(color);
  
  return (
    <div 
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: color,
        color: textColor
      }}
    >
      {option.label}
    </div>
  );
}

//check MULTI-SELECT
/**
 * 检查字段是否为多选类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为多选类型
 */
export function isMultiSelectType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'MULTI-SELECT';
  }
  
  // 检查名称是否暗示为多选类型
  if (tag.name) {
    const multiSelectNames = ['tags', 'tag', '标签', 'multi', '多选', 'labels', '标记', 'options', '选项'];
    
    return multiSelectNames.some(name => 
      tag.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  
  return false;
}

/**
 * 检查列名是否为多选列 - 与标签列有不同的判定逻辑
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为多选列
 */
export function isMultiSelectColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称 - 与标签列使用不同的关键字
  if (typeof tagName === 'string') {
    const multiSelectNames = ['tags', 'tag', '标签', 'multi', '多选', 'labels', '标记', 'options', '选项', 'multi-select', '多选项', 'checklist', '检查项'];
    for (const name of multiSelectNames) {
      if (tagName.toLowerCase() === name || tagName.toLowerCase().includes(name.toLowerCase())) {
        return true;
      }
    }
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'MULTI-SELECT') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string') {
      const multiSelectNames = ['tags', 'tag', '标签', 'multi', '多选', 'labels', '标记', 'options', '选项', 'multi-select', '多选项', 'checklist', '检查项'];
      for (const name of multiSelectNames) {
        if (tagName.name.toLowerCase() === name || tagName.name.toLowerCase().includes(name.toLowerCase())) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * 解析多选值
 * @param {string|Array|Object} value - 多选值
 * @returns {Array} 解析后的多选选项对象数组
 */
export function parseMultiSelectValue(value) {
  // 处理空值
  if (value === null || value === undefined || value === '') {
    return [];
  }
  
  try {
    // 处理字符串格式
    if (typeof value === 'string') {
      // 处理空字符串
      if (value.trim() === '') {
        return [];
      }
      
      try {
        const parsed = JSON.parse(value);
        
        // 如果解析为数组，确保每个元素都是正确格式
        if (Array.isArray(parsed)) {
          return parsed.map(item => {
            if (typeof item === 'object' && item !== null) {
              return {
                label: item.label || '',
                value: item.value || item.label?.toLowerCase().replace(/\s+/g, '_') || '',
                color: item.color || '#10b981'
              };
            } else {
              const strItem = String(item);
              return {
                label: strItem,
                value: strItem.toLowerCase().replace(/\s+/g, '_'),
                color: '#10b981'
              };
            }
          });
        }
        
        // 如果解析为对象，返回包含该对象的数组
        if (parsed && typeof parsed === 'object') {
          return [{
            label: parsed.label || '',
            value: parsed.value || parsed.label?.toLowerCase().replace(/\s+/g, '_') || '',
            color: parsed.color || '#10b981'
          }];
        }
        
        // 其他情况，使用解析值作为单个项
        return [{
          label: String(parsed),
          value: String(parsed).toLowerCase().replace(/\s+/g, '_'),
          color: '#10b981'
        }];
      } catch (e) {
        // 如果不能解析为JSON，返回包含原字符串的数组
        return [{
          label: value,
          value: value.toLowerCase().replace(/\s+/g, '_'),
          color: '#10b981'
        }];
      }
    }
    
    // 处理已经是数组的情况
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return {
            label: item.label || '',
            value: item.value || item.label?.toLowerCase().replace(/\s+/g, '_') || '',
            color: item.color || '#10b981'
          };
        } else {
          const strItem = String(item);
          return {
            label: strItem,
            value: strItem.toLowerCase().replace(/\s+/g, '_'),
            color: '#10b981'
          };
        }
      });
    }
    
    // 处理单个对象
    if (typeof value === 'object' && value !== null) {
      return [{
        label: value.label || '',
        value: value.value || value.label?.toLowerCase().replace(/\s+/g, '_') || '',
        color: value.color || '#10b981'
      }];
    }
    
    // 其他情况
    return [{
      label: String(value),
      value: String(value).toLowerCase().replace(/\s+/g, '_'),
      color: '#10b981'
    }];
  } catch (error) {
    console.error('解析多选值失败:', error);
    return [];
  }
}

/**
 * 渲染多选单元格内容
 * @param {string|Array|Object} value - 多选值
 * @param {Array} options - 可选的选项列表
 * @param {Function} onChange - 选择修改处理函数
 * @param {Function} onCreateOption - 创建新选项处理函数
 * @param {Function} onEditOption - 编辑选项处理函数
 * @param {Function} onDeleteOption - 删除选项处理函数
 * @returns {JSX.Element} 渲染的多选单元格组件
 */
export function renderMultiSelectCell(value, options = [], onChange, onCreateOption, onEditOption, onDeleteOption) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newOption, setNewOption] = useState({ label: '', color: '#10b981' });
  const [editingOption, setEditingOption] = useState(null);
  
  // 解析当前选择的值数组
  const selectedOptions = parseMultiSelectValue(value);
  
  // 过滤选项，排除已选择的选项
  const availableOptions = options.filter(option => 
    !selectedOptions.some(selected => selected.value === option.value) &&
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 处理选项选择/取消选择
  const handleToggleOption = (option) => {
    let updatedSelection;
    
    // 检查选项是否已选中
    const isSelected = selectedOptions.some(item => item.value === option.value);
    
    if (isSelected) {
      // 如果已选中，则移除
      updatedSelection = selectedOptions.filter(item => item.value !== option.value);
    } else {
      // 如果未选中，则添加
      updatedSelection = [...selectedOptions, option];
    }
    
    if (onChange) {
      onChange(updatedSelection);
    }
  };
  
  // 创建新选项
  const handleCreateOption = () => {
    if (onCreateOption && newOption.label.trim()) {
      const optionToAdd = {
        ...newOption,
        value: newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_')
      };
      
      onCreateOption(optionToAdd);
      
      // 自动添加到选中项
      const updatedSelection = [...selectedOptions, optionToAdd];
      if (onChange) {
        onChange(updatedSelection);
      }
      
      setNewOption({ label: '', color: '#10b981' });
      setIsCreating(false);
    }
  };
  
  // 编辑选项
  const handleEditOption = () => {
    if (onEditOption && editingOption) {
      onEditOption(editingOption);
      
      // 更新已选中的选项
      const updatedSelection = selectedOptions.map(item => 
        item.value === editingOption.value ? editingOption : item
      );
      
      if (onChange) {
        onChange(updatedSelection);
      }
      
      setEditingOption(null);
    }
  };
  
  // 删除选项
  const handleDeleteOption = (option, e) => {
    e.stopPropagation();
    if (onDeleteOption) {
      onDeleteOption(option);
      
      // 从选中项中移除
      const updatedSelection = selectedOptions.filter(item => item.value !== option.value);
      if (onChange) {
        onChange(updatedSelection);
      }
    }
  };
  
  // 移除已选择的选项
  const removeSelectedOption = (option, e) => {
    e.stopPropagation();
    const updatedSelection = selectedOptions.filter(item => item.value !== option.value);
    if (onChange) {
      onChange(updatedSelection);
    }
  };
  
  // 开始编辑选项
  const startEditOption = (option, e) => {
    e.stopPropagation();
    setEditingOption({...option});
  };
  
  // 生成随机颜色
  const generateRandomColor = () => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
      '#d946ef', '#ec4899'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center flex-wrap gap-1 hover:bg-accent p-1 rounded-md transition-colors cursor-pointer min-h-[28px]">
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map((option, idx) => (
                <div 
                  key={`selected-${option.value}-${idx}`}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: option.color || '#e5e5e5',
                    color: getContrastTextColor(option.color || '#e5e5e5')
                  }}
                >
                  <span className="truncate max-w-[80px]">{option.label}</span>
                  <X 
                    size={12} 
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => removeSelectedOption(option, e)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{t('selectOptions')}</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2">
          {/* 搜索输入框 */}
          <div className="mb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchOptions')}
              className="w-full p-2 border rounded text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* 已选选项列表 */}
          {selectedOptions.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">{t('selectedOptions')}:</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedOptions.map((option, idx) => (
                  <div 
                    key={`selected-list-${option.value}-${idx}`}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ 
                      backgroundColor: option.color || '#e5e5e5',
                      color: getContrastTextColor(option.color || '#e5e5e5')
                    }}
                  >
                    <span className="truncate max-w-[80px]">{option.label}</span>
                    <X 
                      size={12} 
                      className="cursor-pointer hover:opacity-80"
                      onClick={(e) => removeSelectedOption(option, e)}
                    />
                  </div>
                ))}
              </div>
              <div className="border-t mb-2"></div>
            </div>
          )}
          
          {/* 可用选项列表 - 强调数据选择而非自由输入 */}
          <div className="max-h-40 overflow-y-auto">
            {availableOptions.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 gap-1">
                  {availableOptions.map((option, index) => (
                    <div 
                      key={`available-${option.value}-${index}`} 
                      className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-md cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1" onClick={() => handleToggleOption(option)}>
                        <div className="flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center">
                          {selectedOptions.some(item => item.value === option.value) && (
                            <div 
                              className="w-2 h-2 rounded-sm"
                              style={{ backgroundColor: option.color || '#e5e5e5' }}
                            ></div>
                          )}
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: option.color || '#e5e5e5' }}
                        ></div>
                        <span className="text-sm">{option.label}</span>
                      </div>
                      
                      {/* 选项编辑按钮 */}
                      {onEditOption && onDeleteOption && (
                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => startEditOption(option, e)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => handleDeleteOption(option, e)}
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">
                {searchTerm ? t('noMatchingOptions') : t('noOptions')}
              </div>
            )}
          </div>
          
          {/* 添加新选项按钮 */}
          {onCreateOption && (
            <div className="mt-2 border-t pt-2">
              {isCreating ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newOption.label}
                    onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                    placeholder={t('newOptionName')}
                    className="w-full p-2 border rounded text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="color"
                        value={newOption.color}
                        onChange={(e) => setNewOption({...newOption, color: e.target.value})}
                        className="w-full h-8"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewOption({...newOption, color: generateRandomColor()})}
                      className="h-8"
                    >
                      🎲
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false);
                        setNewOption({ label: '', color: '#10b981' });
                      }}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateOption}
                      disabled={!newOption.label.trim()}
                    >
                      {t('create')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={16} className="mr-1" />
                  {t('addOption')}
                </Button>
              )}
            </div>
          )}
          
          {/* 编辑选项界面 */}
          {editingOption && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingOption(null)}>
              <div className="bg-background p-4 rounded-lg shadow-lg w-72" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-medium mb-4">{t('editOption')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('optionName')}</label>
                    <input
                      type="text"
                      value={editingOption.label}
                      onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('optionColor')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingOption.color}
                        onChange={(e) => setEditingOption({...editingOption, color: e.target.value})}
                        className="w-full h-8"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingOption({...editingOption, color: generateRandomColor()})}
                        className="h-8"
                      >
                        🎲
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingOption(null)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleEditOption}
                      disabled={!editingOption.label.trim()}
                    >
                      {t('save')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * 渲染多选标签组
 * @param {Array} options - 选项数组
 * @returns {JSX.Element} 渲染的标签组组件
 */
export function renderMultiSelectTags(options) {
  if (!options || !Array.isArray(options) || options.length === 0) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option, idx) => (
        <div 
          key={`tag-${option.value}-${idx}`}
          className="px-2 py-0.5 rounded-full text-xs"
          style={{ 
            backgroundColor: option.color || '#e5e5e5',
            color: getContrastTextColor(option.color || '#e5e5e5')
          }}
        >
          <span>{option.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * 检查字段是否为标签类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为标签类型
 */
export function isTagsType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性
  if (tag.type) {
    return checkFieldType(tag) === 'TAGS';
  }
  
  // 检查名称是否暗示为标签类型 - 与多选不同的名称组
  if (tag.name) {
    const tagsNames = ['tags', '标签', 'keywords', '关键词', 'categories', '分类', 'topic', '主题'];
    
    return tagsNames.some(name => 
      tag.name.toLowerCase() === name.toLowerCase() // 标签类型使用精确匹配
    );
  }
  
  return false;
}

/**
 * 检查列名是否为标签列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为标签列
 */
export function isTagsColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称 - 比多选更严格的匹配
  if (typeof tagName === 'string' && (
    tagName.toLowerCase() === 'tags' || 
    tagName.toLowerCase() === '标签' || 
    tagName.toLowerCase() === 'keywords' || 
    tagName.toLowerCase() === '关键词'
  )) {
    return true;
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'TAGS') {
      return true;
    }
    
    // 检查对象是否有name属性
    if (tagName.name && typeof tagName.name === 'string' && (
      tagName.name.toLowerCase() === 'tags' || 
      tagName.name.toLowerCase() === '标签' || 
      tagName.name.toLowerCase() === 'keywords' || 
      tagName.name.toLowerCase() === '关键词'
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * 解析标签值 - 特别处理标签特有的格式
 * @param {string|Array|Object} value - 标签值
 * @returns {Array} 解析后的标签对象数组
 */
export function parseTagsValue(value) {
  // 处理空值
  if (value === null || value === undefined || value === '') {
    return [];
  }
  
  try {
    // 处理字符串格式
    if (typeof value === 'string') {
      // 处理空字符串
      if (value.trim() === '') {
        return [];
      }
      
      try {
        const parsed = JSON.parse(value);
        
        if (Array.isArray(parsed)) {
          return parsed.map(tag => {
            if (typeof tag === 'object' && tag !== null) {
              return {
                text: tag.text || tag.label || '',
                color: tag.color || generateTagColor(tag.text || tag.label || '')
              };
            } else {
              const strTag = String(tag);
              return {
                text: strTag,
                color: generateTagColor(strTag)
              };
            }
          });
        }
        
        if (parsed && typeof parsed === 'object') {
          return [{
            text: parsed.text || parsed.label || '',
            color: parsed.color || generateTagColor(parsed.text || parsed.label || '')
          }];
        }
        
        return [{
          text: String(parsed),
          color: generateTagColor(String(parsed))
        }];
      } catch (e) {
        return [{
          text: value,
          color: generateTagColor(value)
        }];
      }
    }
    
    // 处理已经是数组的情况
    if (Array.isArray(value)) {
      return value.map(tag => {
        if (typeof tag === 'object' && tag !== null) {
          return {
            text: tag.text || tag.label || '',
            color: tag.color || generateTagColor(tag.text || tag.label || '')
          };
        } else {
          const strTag = String(tag);
          return {
            text: strTag,
            color: generateTagColor(strTag)
          };
        }
      });
    }
    
    // 处理单个对象
    if (typeof value === 'object' && value !== null) {
      return [{
        text: value.text || value.label || '',
        color: value.color || generateTagColor(value.text || value.label || '')
      }];
    }
    
    // 其他情况
    return [{
      text: String(value),
      color: generateTagColor(String(value))
    }];
  } catch (error) {
    console.error('解析标签值失败:', error);
    return [];
  }
}

/**
 * 为标签生成特定的颜色 - 使用不同于多选的颜色策略
 * @param {string} tagText - 标签文本
 * @returns {string} 颜色十六进制值
 */
function generateTagColor(tagText) {
  if (!tagText) return '#e2e8f0'; // 默认淡灰色
  
  // 为常见标签类别预定义颜色
  const commonTags = {
    'bug': '#ef4444', // 红色
    'feature': '#3b82f6', // 蓝色
    'improvement': '#10b981', // 绿色
    'documentation': '#8b5cf6', // 紫色
    'urgent': '#f97316', // 橙色
    'low': '#94a3b8', // 灰色
    'medium': '#eab308', // 黄色
    'high': '#f97316', // 橙色
    'critical': '#ef4444', // 红色
  };
  
  // 检查是否匹配常见标签
  for (const [key, color] of Object.entries(commonTags)) {
    if (tagText.toLowerCase().includes(key)) {
      return color;
    }
  }
  
  // 对于非常见标签，使用hash颜色但色调更柔和
  let hash = 0;
  for (let i = 0; i < tagText.length; i++) {
    hash = ((hash << 5) - hash) + tagText.charCodeAt(i);
    hash |= 0; // 转换为32位整数
  }
  
  // 生成柔和的色调 - 高饱和度，高亮度
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 80%)`;
}

/**
 * 渲染标签单元格内容 - 与多选有不同的UI和交互
 * @param {string|Array|Object} value - 标签值
 * @param {Array} suggestedTags - 推荐的标签列表
 * @param {Function} onChange - 标签修改处理函数
 * @returns {JSX.Element} 渲染的标签单元格组件
 */
export function renderTagsCell(value, suggestedTags = [], onChange) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState(parseTagsValue(value));
  
  // 同步外部value和内部状态
  useEffect(() => {
    setSelectedTags(parseTagsValue(value));
  }, [value]);
  
  // 过滤建议标签，排除已选择的标签
  const filteredSuggestions = suggestedTags.filter(tag => 
    !selectedTags.some(selected => selected.value === tag.value) &&
    tag.label.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  // 添加新标签
  const addTag = (tagText) => {
    if (!tagText.trim()) return;
    
    // 检查是否已存在该标签
    if (selectedTags.some(tag => tag.label.toLowerCase() === tagText.toLowerCase())) {
      return;
    }
    
    // 检查是否在推荐标签中
    const existingSuggestion = suggestedTags.find(
      tag => tag.label.toLowerCase() === tagText.toLowerCase()
    );
    
    const newTag = existingSuggestion || {
      label: tagText.trim(),
      value: tagText.trim().toLowerCase().replace(/\s+/g, '-'),
      color: generateTagColor(tagText)
    };
    
    const updatedTags = [...selectedTags, newTag];
    setSelectedTags(updatedTags);
    
    // 调用外部onChange
    if (onChange) {
      onChange(updatedTags);
    }
    
    // 清空输入
    setInputValue('');
  };
  
  // 移除标签
  const removeTag = (tagToRemove) => {
    const updatedTags = selectedTags.filter(tag => tag.value !== tagToRemove.value);
    setSelectedTags(updatedTags);
    
    if (onChange) {
      onChange(updatedTags);
    }
  };
  
  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // 当输入框为空且按下Backspace时，删除最后一个标签
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center flex-wrap gap-1 hover:bg-accent p-1 rounded-md transition-colors cursor-pointer min-h-[28px]">
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag, idx) => (
                <div 
                  key={`tag-${tag.value}-${idx}`}
                  className="px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ 
                    backgroundColor: tag.color || '#e2e8f0',
                    color: getContrastTextColor(tag.color || '#e2e8f0')
                  }}
                >
                  {tag.label}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{t('addTags')}</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div>
          {/* 当前选中的标签 */}
          {selectedTags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {selectedTags.map((tag, idx) => (
                <div 
                  key={`selected-tag-${tag.value}-${idx}`}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium group"
                  style={{ 
                    backgroundColor: tag.color || '#e2e8f0',
                    color: getContrastTextColor(tag.color || '#e2e8f0')
                  }}
                >
                  <span>{tag.label}</span>
                  <X 
                    size={12} 
                    className="cursor-pointer opacity-70 group-hover:opacity-100"
                    onClick={() => removeTag(tag)}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* 标签输入框 */}
          <div className="relative mb-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('typeTagAndEnter')}
              className="w-full p-2 border rounded text-sm pr-10"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute right-1 top-1 h-6 w-6 p-0"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Plus size={16} />
            </Button>
          </div>
          
          {/* 推荐标签 */}
          {filteredSuggestions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">{t('suggestedTags')}:</div>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {filteredSuggestions.map((tag, idx) => (
                  <div 
                    key={`suggestion-${tag.value}-${idx}`}
                    className="px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80"
                    style={{ 
                      backgroundColor: tag.color || '#e2e8f0',
                      color: getContrastTextColor(tag.color || '#e2e8f0')
                    }}
                    onClick={() => addTag(tag.label)}
                  >
                    {tag.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

//check text
/**
 * 检查字段是否为文本类型
 * @param {Object} tag - 标签对象
 * @returns {boolean} 是否为文本类型
 */
export function isTextType(tag) {
  // 检查tag对象
  if (!tag) return false;
  
  // 如果有明确的type属性，检查是否为TEXT
  if (tag.type) {
    return checkFieldType(tag) === 'TEXT';
  }
  
  // 如果没有明确type，所有未被其他类型识别的都默认为文本类型
  // 也可以检查名称是否暗示为文本类型
  if (tag.name) {
    const textNames = ['text', 'description', 'note', '文本', '描述', '备注', 'title', '标题', 'content', '内容'];
    
    if (textNames.some(name => tag.name.toLowerCase().includes(name.toLowerCase()))) {
      return true;
    }
  }
  
  // 没有明确指定其他类型时，默认为文本类型
  return true;
}

/**
 * 检查列名是否为文本列
 * @param {string} tagName - 标签名称
 * @returns {boolean} 是否为文本列
 */
export function isTextColumn(tagName) {
  if (!tagName) return false;
  
  // 检查标准名称
  if (typeof tagName === 'string') {
    // 文本是默认类型，只要不满足其他特定类型就可以视为文本
    if (!isNumberColumn(tagName) && !isDateColumn(tagName) && 
        !isFileColumn(tagName) && !isPeopleColumn(tagName) && 
        !isIdColumn(tagName) && !isSingleSelectColumn(tagName) && 
        !isMultiSelectColumn(tagName) && !isTagsColumn(tagName)) {
      return true;
    }
  }
  
  // 检查标签对象
  if (typeof tagName === 'object' && tagName !== null) {
    // 检查对象是否有type属性
    if (tagName.type && tagName.type.toUpperCase() === 'TEXT') {
      return true;
    }
    
    // 如果没有明确的其他类型，默认为TEXT
    if (!tagName.type || tagName.type === '') {
      return true;
    }
  }
  
  return false;
}

/**
 * 验证文本输入
 * @param {string} value - 文本值
 * @param {Object} options - 验证选项
 * @returns {{isValid: boolean, message: string}} 验证结果
 */
export function validateTextInput(value, options = {}) {
  let { required = false, maxLength, minLength, fieldName, t = null, skipMaxLengthCheck = false } = options;
  
  // 提供默认错误信息（如果没有传入t函数）
  const errorMessages = {
    required: t ? t('validation.required') : 'This field is required',
    minLength: t ? t('validation.minLength', { min: minLength }) : `The input content must be at least ${minLength} characters`,
    maxLength: t ? t('validation.maxLength', { max: maxLength }) : `The input content must be less than ${maxLength} characters`,
  };
  
  // 根据字段名称应用特定验证规则
  if (fieldName) {
    const lowerFieldName = fieldName.toLowerCase();
    
    // 对于Name字段：最小长度2，最大长度50
    if (lowerFieldName === 'name' || lowerFieldName.includes('name') || 
        lowerFieldName === '名称' || lowerFieldName.includes('标题')) {
      minLength = 2;
      maxLength = 50;
      // 通常Name字段为必填
      if (required === undefined) required = true;
    }
    
    // 对于Description字段：最小长度0，最大长度100
    else if (lowerFieldName === 'description' || lowerFieldName.includes('desc') || 
             lowerFieldName === '描述' || lowerFieldName.includes('描述')) {
      minLength = 0;
      maxLength = 100;
    }
    
    // 对于Content字段：最小长度0，最大长度100
    else if (lowerFieldName === 'content' || lowerFieldName.includes('content') || 
             lowerFieldName === '内容' || lowerFieldName.includes('内容')) {
      minLength = 0;
      maxLength = 100;
    }
    
    // 对于Duration字段：处理为数字验证
    else if (lowerFieldName === 'duration' || lowerFieldName.includes('duration') ||
             lowerFieldName === '持续时间' || lowerFieldName.includes('时长')) {
      // 数字验证在validateNumberInput中处理
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return {
          isValid: false,
          message: 'Duration must be a number'
        };
      }
      if (numValue < 0) {
        return {
          isValid: false,
          message: 'Duration cannot be negative'
        };
      }
      if (numValue > 999) {
        return {
          isValid: false,
          message: 'Duration cannot exceed 999'
        };
      }
      return { isValid: true, message: '' };
    }
    
    // 对于Progress字段：处理为百分比验证
    else if (lowerFieldName === 'progress' || lowerFieldName.includes('progress') ||
             lowerFieldName === '进度' || lowerFieldName.includes('进度')) {
      // 百分比验证
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return {
          isValid: false,
          message: 'Progress must be a number'
        };
      }
      if (numValue < 0) {
        return {
          isValid: false,
          message: 'Progress cannot be negative'
        };
      }
      if (numValue > 1) {
        return {
          isValid: false,
          message: 'Progress cannot exceed 100%'
        };
      }
      return { isValid: true, message: '' };
    }
  }
  
  // 安全处理值，避免undefined或null导致错误
  const safeValue = value != null ? String(value) : '';
  
  // 检查必填
  if (required && safeValue.trim() === '') {
    return {
      isValid: false,
      message: errorMessages.required
    };
  }
  
  // 如果非必填且值为空，直接返回有效
  if (!required && safeValue.trim() === '') {
    return {
      isValid: true,
      message: ''
    };
  }
  
  // 检查最小长度
  if (minLength !== undefined && safeValue.length < minLength) {
    return {
      isValid: false,
      message: errorMessages.minLength
    };
  }
  
  // 检查最大长度 - 当skipMaxLengthCheck为true或未定义maxLength时跳过
  if (maxLength !== undefined && !skipMaxLengthCheck && safeValue.length > maxLength) {
    return {
      isValid: false,
      message: errorMessages.maxLength
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
}

/**
 * 文本单元格组件 - 简化版本，使用HTML的maxLength属性限制输入
 */
export function TextCellComponent({ value, onChange, options = {} }) {
  const { multiline = false, placeholder = 'Please enter...', fieldName = '', readOnly = false, maxLength, minLength, required = false } = options;
  
  // 处理可能的对象值，例如 {text: "some text"}
  const processValue = (val) => {
    if (typeof val === 'object' && val !== null) {
      if (val.text !== undefined) return val.text;
      if (val.value !== undefined) return val.value;
      try { return JSON.stringify(val); } catch (e) { return ''; }
    }
    return val || '';
  };
  
  const [inputValue, setInputValue] = useState(processValue(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  // 同步外部value和内部状态
  useEffect(() => {
    if (!isFocused) {
      setInputValue(processValue(value));
    }
  }, [value, isFocused]);
  
  // 组件挂载后自动聚焦
  useEffect(() => {
    if (inputRef.current && !readOnly) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [readOnly]);
  
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    if (onChange) {
      onChange(inputValue);
    }
  };
  
  // 在只读模式下，只显示文本而不是输入框
  if (readOnly) {
    return (
      <div className="w-full text-sm py-1 px-1 overflow-hidden truncate">
        {inputValue}
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {multiline ? (
        <div>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full bg-transparent border rounded focus:outline-none focus:ring-1 p-1 text-sm border-input focus:ring-primary"
            rows={2}
            maxLength={maxLength}
          />
          {/* {maxLength && (
            <div className="flex justify-end mt-1">
              <span className="text-xs text-muted-foreground">
                {inputValue.length}/{maxLength}
              </span>
            </div>
          )} */}
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full bg-transparent border rounded focus:outline-none focus:ring-1 p-1 text-sm border-input focus:ring-primary"
            maxLength={maxLength}
          />
          {/* {maxLength && (
            <div className="flex justify-end mt-1">
              <span className="text-xs text-muted-foreground">
                {inputValue.length}/{maxLength}
              </span>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}

/**
 * 渲染文本单元格内容 - 工厂函数，返回TextCellComponent
 * @param {string} value - 文本值
 * @param {Function} onChange - 文本修改处理函数
 * @param {Object} options - 选项
 * @returns {JSX.Element} 渲染的文本单元格组件
 */
export function renderTextCell(value, onChange, options = {}) {
  // 确保onChange被正确传递且类型为函数
  const handleChange = typeof onChange === 'function' ? onChange : () => {};
  
  // 如果设置了maxLength，自动添加skipMaxLengthCheck=true以跳过验证
  const updatedOptions = {
    ...options,
    skipMaxLengthCheck: options.maxLength !== undefined ? true : options.skipMaxLengthCheck
  };
  
  return (
    <TextCellComponent 
      value={value} 
      onChange={handleChange} 
      options={updatedOptions} 
    />
  );
}

/**
 * 用户缓存管理组件，用于定期清理过期缓存并提供预取功能
 * 可以添加到应用的根组件中
 */
export function UserCacheManager({ prefetchUserIds = [] }) {
  const dispatch = useDispatch();
  
  // 定期清理过期缓存
  useEffect(() => {
    const intervalId = setInterval(cleanExpiredUserCache, USER_CACHE_TIME);
    return () => clearInterval(intervalId);
  }, []);
  
  // 预取用户信息
  useEffect(() => {
    if (!prefetchUserIds.length) return;
    
    // 过滤出缓存中不存在或已过期的用户ID
    const userIdsToFetch = prefetchUserIds.filter(id => 
      !userInfoCache.has(id) || 
      Date.now() - userInfoCache.get(id).timestamp >= USER_CACHE_TIME
    );
    
    if (!userIdsToFetch.length) return;
    
    // 批量预取用户信息
    const prefetchUsers = async () => {
      try {
        // 并发获取多个用户信息，但限制并发数为5
        const batchSize = 5;
        for (let i = 0; i < userIdsToFetch.length; i += batchSize) {
          const batch = userIdsToFetch.slice(i, i + batchSize);
          await Promise.all(batch.map(userId => 
            dispatch(fetchUserById(userId))
              .unwrap()
              .then(result => {
                if (result) {
                  userInfoCache.set(userId, {
                    user: result,
                    timestamp: Date.now()
                  });
                }
              })
              .catch(error => {
                
              })
          ));
        }
      } catch (error) {
        console.error("批量预取用户信息失败:", error);
      }
    };
    
    prefetchUsers();
  }, [prefetchUserIds, dispatch]);
  
  return null; // 这是一个纯功能性组件，不渲染任何UI
}

/**
 * 预取指定用户ID数组的用户信息
 * @param {Array} userIds - 用户ID数组
 * @param {Function} dispatch - Redux dispatch函数
 * @returns {Promise} - 完成预取的Promise
 */
export async function prefetchUsersInfo(userIds, dispatch) {
  if (!Array.isArray(userIds) || !userIds.length || !dispatch) {
    return Promise.resolve();
  }
  
  try {
    // 过滤出缓存中不存在或已过期的用户ID
    const userIdsToFetch = userIds.filter(id => 
      !userInfoCache.has(id) || 
      Date.now() - userInfoCache.get(id).timestamp >= USER_CACHE_TIME
    );
    
    if (!userIdsToFetch.length) {
      return Promise.resolve();
    }
    
    // 批量获取，但限制并发数
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < userIdsToFetch.length; i += batchSize) {
      const batch = userIdsToFetch.slice(i, i + batchSize);
      const batchPromise = Promise.all(
        batch.map(userId => 
          dispatch(fetchUserById(userId))
            .unwrap()
            .then(result => {
              if (result) {
                userInfoCache.set(userId, {
                  user: result,
                  timestamp: Date.now()
                });
              }
              return result;
            })
            .catch(error => {
              
              return null;
            })
        )
      );
      
      batches.push(batchPromise);
    }
    
    return Promise.all(batches);
  } catch (error) {
    console.error("预取用户信息失败:", error);
    return Promise.reject(error);
  }
}

/**
 * 单选选项管理器组件
 * 用于管理SINGLE-SELECT类型的选项，支持添加、编辑和删除选项
 * 
 * @param {Object} props
 * @param {string} props.teamId - 团队ID
 * @param {Array} props.options - 当前可用的选项数组
 * @param {string} props.tagId - 标签ID
 * @param {Object} props.selectedValue - 当前选中的值
 * @param {Function} props.onSelect - 选择事件回调
 * @param {Function} props.onCreateOption - 创建选项回调
 * @param {Function} props.onEditOption - 编辑选项回调
 * @param {Function} props.onDeleteOption - 删除选项回调
 * @param {boolean} props.selectionMode - 是否为选择模式
 */
export function SingleSelectManager({ 
  teamId, 
  options = [],
  tagId,
  selectedValue = null,
  onSelect = () => {},
  onCreateOption = null,
  onEditOption = null,
  onDeleteOption = null,
  selectionMode = true
}) {
  const t = useTranslations('Team');
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  
  // 新增选项状态
  const [isCreating, setIsCreating] = useState(false);
  const [newOption, setNewOption] = useState({
    label: '',
    color: '#10b981',
    value: ''
  });
  
  // 编辑选项状态
  const [isEditing, setIsEditing] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  
  // 生成随机颜色
  const generateRandomColor = () => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
      '#d946ef', '#ec4899'
    ];
    const index = Math.floor(Math.random() * colors.length);
    return colors[index];
  };
  
  // 处理创建新选项
  const handleCreateOption = async () => {
    if (!newOption.label.trim()) {
      alert(t('optionNameRequired') || '选项名称不能为空');
      return;
    }
    
    try {
      setLoading(true);
      
      // 生成value值（如未提供）
      const optionToCreate = {
        ...newOption,
        value: newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_')
      };
      
      // 调用父组件的创建函数
      if (onCreateOption) {
        await onCreateOption(optionToCreate);
      }
      
      // 重置表单
      setNewOption({
        label: '',
        color: '#10b981',
        value: ''
      });
      setIsCreating(false);
      
      // 如果在选择模式下，自动选择新创建的选项
      if (selectionMode && onSelect) {
        onSelect(optionToCreate);
      }
      
    } catch (error) {
      console.error('创建选项失败:', error);
      alert(t('createOptionFailed') || '创建选项失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理更新选项
  const handleUpdateOption = async () => {
    if (!editingOption || !editingOption.label.trim()) {
      alert(t('optionNameRequired') || '选项名称不能为空');
      return;
    }
    
    try {
      setLoading(true);
      
      // 调用父组件的更新函数
      if (onEditOption) {
        await onEditOption(editingOption);
      }
      
      // 重置表单
      setEditingOption(null);
      setIsEditing(false);
      
    } catch (error) {
      console.error('更新选项失败:', error);
      alert(t('updateOptionFailed') || '更新选项失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理删除选项
  const handleDeleteOption = async (option) => {
    if (window.confirm(t('confirmDeleteOption') || '确定要删除此选项吗？')) {
      try {
        setLoading(true);
        
        // 调用父组件的删除函数
        if (onDeleteOption) {
          await onDeleteOption(option);
        }
        
      } catch (error) {
        console.error('删除选项失败:', error);
        alert(t('deleteOptionFailed') || '删除选项失败');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // 开始编辑选项
  const startEditOption = (option) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditingOption({...option});
  };
  
  // 处理选择选项
  const handleSelectOption = (option) => {
    if (selectionMode && onSelect) {
      onSelect(option);
    }
  };
  
  return (
    <div className="w-full rounded-md border">
      <div className="p-3">
        {/* 标题和创建按钮 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">{selectionMode ? t('selectOption') || '选择选项' : t('manageOptions') || '管理选项'}</h3>
          
          {/* 只在管理模式下显示添加按钮 - 选择模式下在底部显示 */}
          {!selectionMode && onCreateOption && !isCreating && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
              }}
              disabled={loading}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('addOption') || '添加选项'}
            </Button>
          )}
        </div>
        
        {/* 创建选项表单 - 在选择模式下也显示 */}
        {isCreating && (
          <div className="mb-4 p-3 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">{t('addOption') || '添加选项'}</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => {
                  setIsCreating(false);
                  setNewOption({
                    label: '',
                    color: '#10b981',
                    value: ''
                  });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionName') || '选项名称'}</label>
                <input
                  type="text"
                  value={newOption.label}
                  onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:outline-none text-sm"
                  placeholder={t('enterOptionName') || '输入选项名称'}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionColor') || '选项颜色'}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newOption.color}
                    onChange={(e) => setNewOption({...newOption, color: e.target.value})}
                    className="w-full h-8"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewOption({...newOption, color: generateRandomColor()})}
                    className="h-8"
                  >
                    🎲
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleCreateOption}
                  disabled={loading || !newOption.label.trim()}
                  className="h-8"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-background border-t-primary rounded-full animate-spin mr-1" />
                  ) : null}
                  {t('create') || '创建'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 编辑选项表单 - 仅在非选择模式下显示 */}
        {isEditing && !selectionMode && (
          <div className="mb-4 p-3 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">{t('editOption') || '编辑选项'}</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => {
                  setIsEditing(false);
                  setEditingOption(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionName') || '选项名称'}</label>
                <input
                  type="text"
                  value={editingOption?.label || ''}
                  onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:outline-none text-sm"
                  placeholder={t('enterOptionName') || '输入选项名称'}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionColor') || '选项颜色'}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingOption?.color || '#10b981'}
                    onChange={(e) => setEditingOption({...editingOption, color: e.target.value})}
                    className="w-full h-8"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingOption({...editingOption, color: generateRandomColor()})}
                    className="h-8"
                  >
                    🎲
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleUpdateOption}
                  disabled={loading || !editingOption?.label?.trim()}
                  className="h-8"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-background border-t-primary rounded-full animate-spin mr-1" />
                  ) : null}
                  {t('save') || '保存'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 选项列表 */}
        <div className="grid grid-cols-1 gap-2">
          {options.length > 0 ? (
            options.map((option, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-2 border ${selectedValue && selectedValue.value === option.value ? 'border-primary ring-1 ring-primary' : 'border-gray-300 dark:border-gray-700'} rounded-lg transition-all duration-200 ${selectionMode ? 'cursor-pointer hover:bg-accent/10' : ''}`}
                style={{ borderLeft: `3px solid ${option.color}` }}
                onClick={selectionMode ? () => handleSelectOption(option) : undefined}
                tabIndex={selectionMode ? 0 : undefined}
                role={selectionMode ? "button" : undefined}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: option.color || '#e5e5e5' }}
                  ></div>
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                
                {/* 在选择模式下显示选中标记，在管理模式下显示编辑删除按钮 */}
                {!isCreating && !isEditing && (
                  selectionMode ? (
                    selectedValue && selectedValue.value === option.value && (
                      <Check className="w-4 h-4 text-primary" />
                    )
                  ) : (
                    <div className="flex gap-1">
                      {onEditOption && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0.5 rounded-full opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditOption(option);
                          }}
                          disabled={loading}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {onDeleteOption && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0.5 rounded-full text-destructive hover:text-destructive opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOption(option);
                          }}
                          disabled={loading}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground border border-gray-300 dark:border-gray-700 rounded-lg text-sm">
              {selectionMode ? t('noOptions') || '没有可选项' : t('noStatusOptions') || '没有状态选项'}
            </div>
          )}
        </div>
        
        {/* 在选择模式下显示添加选项按钮 */}
        {selectionMode && onCreateOption && !isCreating && !isEditing && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
              }}
              disabled={loading}
              className="w-full h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('addOption') || '添加选项'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 强化版的SINGLE-SELECT选择组件
 * 集成了选项管理功能，支持创建、编辑和删除选项
 * 
 * @param {Object} props
 * @param {string|Object} props.value - 当前选中的值
 * @param {Array} props.options - 当前可用的选项数组
 * @param {Function} props.onChange - 值改变回调
 * @param {string} props.teamId - 团队ID
 * @param {string} props.tagId - 标签ID
 * @param {Function} props.onCreateOption - 外部创建选项回调
 * @param {Function} props.onEditOption - 外部编辑选项回调
 * @param {Function} props.onDeleteOption - 外部删除选项回调
 */
export function EnhancedSingleSelect({ 
  value, 
  options = [], 
  onChange, 
  teamId, 
  tagId,
  disabled = false,
  onCreateOption: externalCreateOption,
  onEditOption: externalEditOption,
  onDeleteOption: externalDeleteOption
}) {
  const t = useTranslations('Team');
  const [open, setOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState(options);
  const selectedOption = parseSingleSelectValue(value);
  
  // 不再使用动态导入
  // const TagLabelManager = React.lazy(() => import('./TagLabelManager'));
  
  // 同步外部options和内部状态
  useEffect(() => {
    setLocalOptions(options);
  }, [options]);
  
  // 调试输出
  useEffect(() => {
    
    
    
  }, [teamId, options, selectedOption]);
  
  // 处理选择选项
  const handleSelectOption = (option) => {
    
    if (onChange) {
      onChange(option);
    }
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <div className={`flex items-center gap-2 justify-between rounded-md border p-2 ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50'}`}>
          {selectedOption ? (
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: selectedOption.color || '#e5e5e5' }}
              ></div>
              <span className="text-sm truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{t('selectOption') || '选择选项'}</span>
          )}
          {!disabled && (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
              <path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <TagLabelManager
          teamId={teamId}
          selectedValue={selectedOption}
          onSelect={handleSelectOption}
          selectionMode={true}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * 验证数字输入
 * @param {number|string} value - 数字值
 * @param {Object} options - 验证选项
 * @returns {{isValid: boolean, message: string}} 验证结果
 */
export function validateNumberInput(value, options = {}) {
  const { min = 0, max, fieldName, required = false, t = null } = options;
  
  // 提供默认错误信息
  const errorMessages = {
    required: t ? t('validation.required') : 'This field is required',
    notNumber: t ? t('validation.notNumber') : 'Please enter a valid number',
    tooSmall: t ? t('validation.tooSmall', { min }) : `Value must be at least ${min}`,
    tooLarge: t ? t('validation.tooLarge', { max }) : `Value must be less than ${max}`
  };
  
  // 处理空值
  if (value === '' || value === null || value === undefined) {
    if (required) {
      return {
        isValid: false,
        message: errorMessages.required
      };
    }
    return { isValid: true, message: '' };
  }
  
  // 转换为数字并验证
  const numValue = Number(value);
  
  // 验证是否为有效数字
  if (isNaN(numValue)) {
    return {
      isValid: false,
      message: errorMessages.notNumber
    };
  }
  
  // 根据字段名称应用特定验证规则
  if (fieldName) {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Duration字段：最小值0，最大值999
    if (lowerFieldName === 'duration' || lowerFieldName.includes('duration') ||
        lowerFieldName === '持续时间' || lowerFieldName.includes('时长')) {
      if (numValue < 0) {
        return {
          isValid: false,
          message: 'Duration cannot be negative'
        };
      }
      if (numValue > 999) {
        return {
          isValid: false,
          message: 'Duration cannot exceed 999'
        };
      }
    }
    
    // Progress字段：最小值0，最大值1（100%）
    else if (lowerFieldName === 'progress' || lowerFieldName.includes('progress') ||
             lowerFieldName === '进度' || lowerFieldName.includes('进度')) {
      if (numValue < 0) {
        return {
          isValid: false,
          message: 'Progress cannot be negative'
        };
      }
      if (numValue > 1) {
        return {
          isValid: false,
          message: 'Progress cannot exceed 100%'
        };
      }
    }
  }
  
  // 检查最小值
  if (min !== undefined && numValue < min) {
    return {
      isValid: false,
      message: errorMessages.tooSmall
    };
  }
  
  // 检查最大值
  if (max !== undefined && numValue > max) {
    return {
      isValid: false,
      message: errorMessages.tooLarge
    };
  }
  
  return { isValid: true, message: '' };
}