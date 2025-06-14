//how to check field type
//with the tag table, there is a column called type
//the type is used to check the field type
//the type is TEXT, NUMBER, ID, SINGLE-SELECT, MULTI-SELECT, DATE, PEOPLE, TAGS, FILE

import { FileText, File, Sheet, FileCode, X, User, Calendar, Fingerprint, Copy, CheckCheck, Trash, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import { fetchTaskById, updateTask } from '@/lib/redux/features/taskSlice';

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
 * @returns {JSX.Element} 对应文件类型的图标组件
 */
export function getFileIcon(fileName) {
  if (!fileName) return <File size={16} className="text-gray-500" />;
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
    return <FileCode size={16} className="text-blue-500" />;
  } else if (['java'].includes(extension)) {
    return <FileCode size={16} className="text-orange-500" />;
  } else if (['doc', 'docx', 'txt'].includes(extension)) {
    return <FileText size={16} className="text-blue-600" />;
  } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return <Sheet size={16} className="text-green-600" />;
  }
  
  return <File size={16} className="text-gray-500" />;
}

/**
 * 渲染文件单元格内容
 * @param {string} fileName - 文件名
 * @param {Function} onClick - 点击处理函数
 * @returns {JSX.Element} 渲染的文件单元格组件
 */
export function renderFileCell(fileName, onClick) {
  return (
    <div 
      className={`flex items-center gap-2 justify-between cursor-pointer transition-colors p-1 rounded hover:text-primary hover:bg-accent border dark:border-gray-800 border-gray-300`}
    >
      <div className="flex items-center gap-2">
        {getFileIcon(fileName)}
        <span>{fileName}</span>
      </div>
    </div>
  );
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
 * @returns {JSX.Element} 渲染的数字单元格组件
 */
export function renderNumberCell(value, onIncrease, onDecrease, onChange) {
  // 确保value是数字
  const numValue = typeof value === 'number' ? value : Number(value) || 0;
  
  // 格式化小数点显示，小数点数字只显示2位
  const displayValue = numValue % 1 !== 0 ? numValue.toFixed(2) : numValue;
  
  return (
    <div className="flex items-center justify-between rounded">
      <button 
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-gray-500 hover:text-primary"
        onClick={() => onDecrease(numValue)}
        aria-label="减少数值"
        min={0}
      >
        -
      </button>
      <span className="w-8 text-center">{displayValue}</span>
      <button 
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-gray-500 hover:text-primary"
        onClick={() => onIncrease(numValue)}
        aria-label="增加数值"
        max={999}
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
  // 将输入转换为数字
  let num = typeof value === 'number' ? value : Number(value);
  
  // 处理NaN情况
  if (isNaN(num)) return 0;
  
  // 应用最小值和最大值约束
  if (options.min !== undefined && num < options.min) {
    num = options.min;
  }
  
  if (options.max !== undefined && num > options.max) {
    num = options.max;
  }
  
  // 处理小数位数
  if (options.decimalPlaces !== undefined) {
    const factor = Math.pow(10, options.decimalPlaces);
    num = Math.round(num * factor) / factor;
  } else if (num % 1 !== 0) {
    // 如果是小数且未指定小数位数，自动调整为两位小数
    const factor = Math.pow(10, 2);
    num = Math.round(num * factor) / factor;
  }
  
  return num;
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
    );
  }
  
  // 显示多个用户
  return (
    <div className="flex flex-col gap-2 w-full">
      <MultipleUsers userIds={userIds} />
      
      {/* 始终允许管理负责人 */}
      {taskId && (
        <div className="mt-1 space-y-1">
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
          
          {teamId && (
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleUserAdded} 
            />
          )}
        </div>
      )}
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
  const { users, isLoading } = useUserData(userId);
  const user = users[0]; // 单个用户ID只会有一个结果
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse"></div>
        <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback>
            <User size={14} />
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground text-sm">ID: {userId ? userId.substring(0, 8) : '未知'}</span>
      </div>
    );
  }
  
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 hover:bg-accent p-1 rounded-md transition-colors">
        <Avatar className="h-6 w-6">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback>{user.name?.[0] || <User size={14} />}</AvatarFallback>
        </Avatar>
        <span className="text-sm truncate">{user.name || user.email || userId.substring(0, 8)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex items-start gap-4 p-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback>{user.name?.[0] || <User size={20} />}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.name || '未知用户'}</span>
            <span className="text-sm text-muted-foreground">{user.email || `ID: ${userId.substring(0, 8)}...`}</span>
            {user.title && (
              <span className="text-sm text-muted-foreground mt-1">{user.title}</span>
            )}
          </div>
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
  const { users, isLoading } = useUserData(userIds);
  const displayCount = 2; // 显示的头像数量
  
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 hover:bg-accent p-1 rounded-md transition-colors">
        <div className="flex -space-x-2">
          {/* 显示前N个用户头像 */}
          {users.slice(0, displayCount).map((user, idx) => (
            <Avatar key={user?.id || idx} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback>
                {user?.name?.[0] || <User size={14} />}
              </AvatarFallback>
            </Avatar>
          ))}
          
          {/* 如果有更多用户，显示额外数量 */}
          {userIds.length > displayCount && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
              +{userIds.length - displayCount}
            </div>
          )}
          
          {/* 如果还在加载中，显示加载指示器 */}
          {isLoading && users.length === 0 && (
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse border-2 border-background"></div>
          )}
        </div>
        <span className="text-sm truncate">
          {users.length ? `${users[0]?.name || users[0]?.email || '用户'} ${users.length > 1 ? `+${users.length - 1}` : ''}` : 
          isLoading ? '加载中...' : `${userIds.length} 用户`}
        </span>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-0" align="start" side="bottom">
        <div className="p-2">
          <h4 className="text-sm font-medium mb-2 px-2">{t('assigned_users')}</h4>
          <div className="max-h-60 overflow-y-auto">
            {isLoading && userIds.length > users.length ? (
              <div className="flex items-center justify-center py-2">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-muted-foreground">{t('loading')}</span>
              </div>
            ) : null}
            
            {users.map((user, idx) => (
              <div key={user?.id || idx} className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-md">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback>{user?.name?.[0] || <User size={14} />}</AvatarFallback>
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
                  <AvatarFallback><User size={14} /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{t('unknown_user')}</span>
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
      className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
      title="移除负责人"
    >
      <Trash className="w-3 h-3" />
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

  return (
    <div className="flex justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 h-7 border border-dashed border-primary/50 hover:border-primary"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <h4 className="text-sm font-medium mb-2">{t('add_assignee') || '添加负责人'}</h4>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-muted-foreground">{t('loading') || '加载中...'}</span>
            </div>
          ) : error ? (
            <div className="text-center py-2 text-sm text-destructive">
              {error}
            </div>
          ) : membersNotYetAssigned.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {membersNotYetAssigned.map(member => (
                <div 
                  key={member.user_id} 
                  className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer"
                  onClick={() => handleAddUserToAssignee(member.user_id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>{member.name?.[0] || <User size={14} />}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs text-medium">{member.user_id}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-sm text-muted-foreground">
              {t('no_available_members') || '没有可添加的团队成员'}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
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
              {assignees.map(userId => (
                <div key={userId} className="flex items-center justify-between p-1 rounded-md hover:bg-accent/50 group">
                  <PeopleDisplay userId={userId} />
                  <RemoveUserFromAssignee 
                    taskId={taskId} 
                    userIdToRemove={userId} 
                    onRemoved={handleRemoveAssignee}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-1 flex items-center gap-2">
              <User size={14} className="text-muted-foreground" />
              {t('unassigned') || '未分配'}
            </div>
          )}
          
          {/* 添加负责人按钮 */}
          <div className="mt-1">
            <AddUserToAssignee 
              teamId={teamId} 
              taskId={taskId} 
              onAdded={handleAddAssignee}
            />
          </div>
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
            onChange={(e) => {
              if (onChange) {
                onChange(e.target.value);
              }
            }}
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
  // 如果值是空的，返回null
  if (!value) return null;
  
  // 如果已经是对象形式，直接返回
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  
  // 尝试解析JSON字符串
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (e) {
      // 不是有效的JSON，将作为纯文本选项处理
    }
    
    // 作为普通文本处理
    return {
      label: value,
      value: value,
      color: generateColorFromLabel(value)
    };
  }
  
  // 返回默认值
  return null;
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
 * @returns {JSX.Element} 渲染的单选单元格组件
 */
export function renderSingleSelectCell(value, options = [], onChange, onCreateOption, onEditOption, onDeleteOption) {
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
  // 如果值是空的，返回空数组
  if (!value) return [];
  
  // 如果已经是数组形式，确保每个元素是对象
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item;
      }
      return {
        label: String(item),
        value: String(item),
        color: generateColorFromLabel(String(item)) // 使用通用颜色生成函数
      };
    });
  }
  
  // 尝试解析JSON字符串
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      
      // 如果解析结果是数组，处理每个元素
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item;
          }
          return {
            label: String(item),
            value: String(item),
            color: generateColorFromLabel(String(item))
          };
        });
      }
      
      // 如果解析结果是单个对象，放入数组返回
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }
    } catch (e) {
      // 不是有效的JSON，仅将作为逗号分隔的文本处理
      if (value.includes(',')) {
        return value.split(',').map(item => ({
          label: item.trim(),
          value: item.trim(),
          color: generateColorFromLabel(item.trim())
        }));
      }
      
      // 单个文本值
      return [{
        label: value,
        value: value,
        color: generateColorFromLabel(value)
      }];
    }
  }
  
  // 返回默认空数组
  return [];
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
  // 如果值是空的，返回空数组
  if (!value) return [];
  
  // 如果已经是数组形式，确保每个元素是对象
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item;
      }
      return {
        label: String(item),
        value: String(item),
        color: generateTagColor(String(item)) // 使用标签专用的颜色生成
      };
    });
  }
  
  // 尝试解析JSON字符串
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      
      // 如果解析结果是数组，处理每个元素
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item;
          }
          return {
            label: String(item),
            value: String(item),
            color: generateTagColor(String(item))
          };
        });
      }
      
      // 如果解析结果是单个对象，放入数组返回
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }
    } catch (e) {
      // 不是有效的JSON，特殊处理为空格或分号分隔的标签格式
      const separators = [',', ';', ' ']; 
      for (const separator of separators) {
        if (value.includes(separator)) {
          return value.split(separator)
            .map(item => item.trim())
            .filter(Boolean) // 过滤空字符串
            .map(item => ({
              label: item,
              value: item,
              color: generateTagColor(item)
            }));
        }
      }
      
      // 单个文本值
      return [{
        label: value,
        value: value,
        color: generateTagColor(value)
      }];
    }
  }
  
  // 返回默认空数组
  return [];
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
 * @param {boolean} options.required - 是否必填
 * @param {number} options.maxLength - 最大长度
 * @param {number} options.minLength - 最小长度
 * @returns {Object} 验证结果，包含isValid和message
 */
export function validateTextInput(value, options = {}) {
  const { required = false, maxLength, minLength } = options;
  
  // 检查必填
  if (required && (!value || value.trim() === '')) {
    return {
      isValid: false,
      message: '此字段不能为空'
    };
  }
  
  // 如果非必填且值为空，直接返回有效
  if (!required && (!value || value.trim() === '')) {
    return {
      isValid: true,
      message: ''
    };
  }
  
  // 检查最小长度
  if (minLength !== undefined && value && value.length < minLength) {
    return {
      isValid: false,
      message: `输入内容至少需要${minLength}个字符`
    };
  }
  
  // 检查最大长度
  if (maxLength !== undefined && value && value.length > maxLength) {
    return {
      isValid: false,
      message: `输入内容不能超过${maxLength}个字符`
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
}

/**
 * 渲染文本单元格内容
 * @param {string} value - 文本值
 * @param {Function} onChange - 文本修改处理函数
 * @param {Object} options - 选项
 * @returns {JSX.Element} 渲染的文本单元格组件
 */
export function renderTextCell(value, onChange, options = {}) {
  const { multiline = false, placeholder = 'Please enter...' } = options;
  
  return (
    <div className="w-full">
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded p-1 text-sm"
          rows={2}
          max={100}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded p-1 text-sm"
          max={50}
        />
      )}
    </div>
  );
}