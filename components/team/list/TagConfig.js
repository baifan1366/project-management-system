//check field type
//1. people
//2. single select
//3. date
//4. id
//6. tags
//7. multi select

//how to check field type
//with the tag table, there is a column called type
//the type is used to check the field type
//the type is TEXT, NUMBER, ID, SINGLE-SELECT, MULTI-SELECT, DATE, PEOPLE, TAGS, FILE

import { FileText, File, Sheet, FileCode, X, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { useTranslations } from 'next-intl';

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
      <div className="cursor-pointer" onClick={onClick}>
        <X size={16} className="text-gray-500 hover:text-red-500" />
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
      >
        -
      </button>
      <span className="w-8 text-center">{displayValue}</span>
      <button 
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-gray-500 hover:text-primary"
        onClick={() => onIncrease(numValue)}
        aria-label="增加数值"
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
  console.log('解析用户ID输入:', userIdStr, '类型:', typeof userIdStr);
  
  // 处理数组情况
  if (Array.isArray(userIdStr)) {
    console.log('输入是数组格式，直接返回:', userIdStr);
    return userIdStr;
  }
  
  // 如果输入为空或非字符串类型，返回空数组
  if (!userIdStr || typeof userIdStr !== 'string') {
    console.log('无效的用户ID输入，返回空数组');
    return [];
  }
  
  // 处理字符串类型的输入
  const ids = userIdStr.split(',').map(id => id.trim()).filter(Boolean);
  console.log('解析后的用户ID数组:', ids);
  return ids;
}

/**
 * 获取用户数据并缓存
 * @param {string|array} userIdStr - 用户ID或逗号分隔的多个用户ID或ID数组
 * @returns {{users: Object[], isLoading: boolean}} 用户数据数组和加载状态
 */
export function useUserData(userIdStr) {
  console.log('useUserData被调用，输入:', userIdStr);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [loadedIds, setLoadedIds] = useState([]);
  const reduxUsers = useSelector((state) => state.users.users);
  console.log('当前Redux中的用户数据:', reduxUsers);
  
  // 解析可能包含多个ID的字符串或数组
  const userIds = parseUserIds(userIdStr);
  console.log('需要获取数据的用户ID:', userIds);
  
  // 从Redux存储中获取已加载的用户
  const users = userIds
    .map(id => {
      const user = reduxUsers.find(u => u?.id === id);
      console.log(`查找用户ID ${id} 结果:`, user ? '找到' : '未找到', user);
      return user;
    })
    .filter(Boolean);
  console.log('从Redux找到的用户:', users);
  
  // 确定哪些ID尚未加载
  const unloadedIds = userIds.filter(id => 
    !reduxUsers.some(u => u?.id === id) && 
    !loadedIds.includes(id)
  );
  console.log('未加载的用户ID:', unloadedIds);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchUsers = async () => {
      if (!userIds.length || !unloadedIds.length) {
        console.log('无需加载用户数据', { userIds, unloadedIds });
        return;
      }
      
      setIsLoading(true);
      console.log('开始获取用户数据，用户ID:', unloadedIds);
      
      try {
        // 对每个未加载的ID单独发起请求
        const fetchPromises = unloadedIds.map(userId => {
          console.log(`发起获取用户 ${userId} 的请求`);
          return dispatch(fetchUserById(userId)).unwrap()
            .then(result => {
              console.log(`用户 ${userId} 数据获取成功:`, result);
              return result;
            })
            .catch(error => {
              console.error(`获取用户 ${userId} 信息失败:`, error);
              return null;
            });
        });
        
        const results = await Promise.all(fetchPromises);
        console.log('所有用户请求已完成, 结果:', results);
        
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
 * 呈现人员单元格的内容，包括头像和Popover
 * @param {string} userIdStr - 用户ID或逗号分隔的多个用户ID
 * @returns {JSX.Element} 渲染的人员单元格组件
 */
export function renderPeopleCell(userIdStr) {
  const t = useTranslations('Team');
  console.log('renderPeopleCell被调用，userIdStr:', userIdStr);
  const userIds = parseUserIds(userIdStr);
  console.log('渲染人员单元格的用户ID:', userIds);
  
  if (!userIds.length) {
    console.log('无用户ID，显示未分配状态');
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback>
            <User size={14} />
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground text-sm">{t('unassigned')}</span>
      </div>
    );
  }
  
  // 如果只有一个用户，显示单个用户
  if (userIds.length === 1) {
    console.log('单用户显示');
    return <PeopleDisplay userId={userIds[0]} />;
  }
  
  // 显示多个用户
  console.log('多用户显示');
  return <MultipleUsers userIds={userIds} />;
}

/**
 * 单个人员显示组件，包含Popover效果
 * @param {Object} props - 组件属性
 * @param {string} props.userId - 用户ID
 * @returns {JSX.Element} 人员显示组件
 */
function PeopleDisplay({ userId }) {
  console.log('PeopleDisplay组件渲染，userId:', userId);
  const { users, isLoading } = useUserData(userId);
  console.log('PeopleDisplay获取到的用户数据:', users, '加载状态:', isLoading);
  const user = users[0]; // 单个用户ID只会有一个结果
  
  if (isLoading) {
    console.log('PeopleDisplay: 正在加载中');
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse"></div>
        <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }
  
  if (!user) {
    console.log('PeopleDisplay: 未找到用户数据');
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
  
  console.log('PeopleDisplay: 渲染用户数据', user);
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
  console.log('MultipleUsers组件渲染，userIds:', userIds);
  const { users, isLoading } = useUserData(userIds);
  console.log('MultipleUsers获取到的用户数据:', users, '加载状态:', isLoading);
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
          <h4 className="text-sm font-medium mb-2 px-2">已分配用户 ({userIds.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            {isLoading && userIds.length > users.length ? (
              <div className="flex items-center justify-center py-2">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-muted-foreground">加载用户信息...</span>
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
                  <span className="font-medium text-sm">未知用户</span>
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
