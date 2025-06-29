"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Plus, Info, Check, Pen, Settings, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useDispatch, useSelector } from 'react-redux';
import { updateRole, deleteRole } from '@/lib/redux/features/agileSlice';
import RoleForm from './RoleForm';
import { fetchAgileRoles } from '@/lib/redux/features/agileSlice';
import { createRole } from '@/lib/redux/features/agileSlice';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// 角色职责简述（保留，因为这些通常是固定的业务规则）
const ROLE_RESPONSIBILITIES = {
  'product_owner': [
    '管理产品待办事项（Product Backlog）',
    '确保产品待办事项条目清晰并按优先级排序',
    '与团队和利益相关者沟通产品愿景',
    '确保产品增量满足业务需求'
  ],
  'scrum_master': [
    '促进Scrum事件（冲刺规划、每日站会、冲刺评审、冲刺回顾）',
    '教导团队遵循Scrum规则',
    '帮助团队消除进度障碍',
    '协助Product Owner管理产品待办事项'
  ],
  'dev_team': [
    '自组织如何完成工作',
    '将产品待办事项转化为可工作的产品增量',
    '参与估算和承诺完成工作',
    '共同对冲刺承诺负责'
  ],
  'qa': [
    '设计、实施和维护测试策略',
    '编写和执行测试用例',
    '报告和跟踪缺陷',
    '确保软件符合质量标准'
  ],
  'ux_designer': [
    '研究用户需求和行为',
    '创建用户流程、线框图和原型',
    '设计视觉元素和界面',
    '与开发团队合作实施设计'
  ],
  'stakeholder': [
    '提供业务需求和反馈',
    '参与冲刺评审会议',
    '验收完成的功能',
    '提供产品方向的输入'
  ]
};

const RoleAssignment = ({ teamId, agileId, agileRoles = [], agileMembers = [], onUpdateMembers, themeColor }) => {
  const t = useTranslations('Agile');
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRoleInfoExpanded, setIsRoleInfoExpanded] = useState(false);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const {user} = useGetUser();
  const { teams } = useSelector(state => state.teams);
  const { users } = useSelector(state => state.users);

  const userId = user?.id;
  // 检查当前用户是否是团队创建者
  const isTeamCreator = useMemo(() => {
    if (!user) return false;
    
    // 在teams中查找对应的团队
    const team = teams?.find(t => t.id === Number(teamId));
    if (!team) return false;
    
    // 判断当前用户是否是团队创建者
    return team.created_by === user.id;
  }, [user, teams, teamId]);
  // 从Redux获取团队信息
  const team = useSelector(state => {
    // 根据Redux状态结构，找到对应teamId的团队
    if (!state.teams || typeof state.teams !== 'object') return null;
    
    // 检查teams是否是数组或对象
    if (Array.isArray(state.teams)) {
      // 如果是数组，查找匹配teamId的团队
      return state.teams.find(t => t && t.id && t.id.toString() === teamId?.toString());
    } else {
      // 如果是对象，直接获取键为0的团队
      return state.teams[0] || null;
    }
  });
  
  // 添加编辑和删除角色相关的状态
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // 专门监听角色列表变化的effect
  useEffect(() => {
    // 当角色列表更新时重新渲染组件
    setLoading(false);
  }, [agileRoles]);

  // 检查角色名称是否已存在
  const checkRoleNameExists = (name) => {
    if (!agileRoles || !Array.isArray(agileRoles)) return false;
    
    return agileRoles.some(role => 
      role && 
      role.name && 
      role.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
  };
  
  // 修改角色名称，如果存在重复则添加后缀
  const getUniqueRoleName = (name) => {
    if (!checkRoleNameExists(name)) return name;
    
    return `${name} (1)`;
  };

  // 修改获取团队成员
  useEffect(() => {
    if (teamId) {
      setLoading(true);
      // 从API获取团队成员
      fetch(`/api/teams/${teamId}/members`)
        .then(res => res.json())
        .then(data => {
          setTeamMembers(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('获取团队成员失败:', err);
          // 即使获取失败，也使用agileMembers数据
          setLoading(false);
        });
    }
  }, [teamId, agileId]);

  // 获取成员信息 - 修正版，同时支持id和user_id
  const getMemberInfo = (userId) => {
    if (!userId) return null;
    
    // 检查是否为多个ID（逗号分隔）
    if (typeof userId === 'string' && userId.includes(',')) {
      // 对于多个ID，获取每个用户的信息并组合
      const userIds = userId.split(',').filter(id => id.trim());
      const usersList = userIds.map(id => {
        // 为每个ID获取用户信息 - 优先从users中查找
        const userInfo = users?.find(u => 
          (u.id && u.id.toString() === id.trim()) || 
          (u.user_id && u.user_id.toString() === id.trim())
        ) || 
        userCache[id.trim()] || 
        agileMembers?.find(member => 
          (member.user_id && member.user_id.toString() === id.trim()) || 
          (member.id && member.id.toString() === id.trim())
        );
        
        return userInfo || { id: id.trim(), name: 'Loading...' };
      });
      
      return {
        id: userId,
        users: usersList,
        isMultiple: true,
        count: usersList.length
      };
    }
    
    // 将userId转换为字符串以确保一致性
    const idStr = userId.toString();
    
    // 检查是否已经在Redux store中有此用户 - 优先从users中查找
    const userFromStore = users?.find(user => 
      (user.id && user.id.toString() === idStr) || 
      (user.user_id && user.user_id.toString() === idStr)
    );
    
    if (userFromStore) {
      return userFromStore;
    }
    
    // 检查是否在本地缓存中
    if (userCache[idStr]) {
      return userCache[idStr];
    }
    
    // 如果都没有，从agileMembers尝试获取
    const memberInfo = agileMembers?.find(member => 
      (member.user_id && member.user_id.toString() === idStr) || 
      (member.id && member.id.toString() === idStr)
    );
    
    if (memberInfo) {
      return memberInfo;
    }
    
    // 返回一个简单对象，不在渲染期间调用setState
    return { id: idStr, name: 'Loading...' };
  };
  
  // 单独的函数用于请求用户数据，避免在渲染时调用 - 修正版
  const fetchMemberInfo = (userId) => {
    if (!userId) return;
    
    // 确保userId是字符串类型
    const id = userId.toString();
    
    // 如果ID包含逗号，说明是多个ID，这里应处理为单个ID
    if (id.includes(',')) {
      // 拆分ID并分别获取
      const ids = id.split(',');
      ids.forEach(singleId => {
        if (singleId && singleId.trim()) {
          // 递归调用但传入单个ID
          fetchMemberInfo(singleId.trim());
        }
      });
      return;
    }
    
    // 如果用户既不在Redux也不在缓存中，则通过API获取
    if (!users?.find(user => 
        (user.id && user.id.toString() === id) || 
        (user.user_id && user.user_id.toString() === id)
      ) && !userCache[id]) {
      try {
        dispatch(fetchUserById(id));
      } catch (err) {
        console.error(`获取用户信息失败: ${id}`, err);
      }
    }
  };

  // 获取角色信息
  const getRoleInfo = (roleId) => {
    if (!roleId) return null;
    
    // 确保roleId是字符串类型进行比较
    const roleInfo = agileRoles.find(role => role.id && role.id.toString() === roleId.toString());
    return roleInfo || null;
  };
  
  // 获取成员角色
  const getMemberRole = (userId) => {
    if (!userId || !agileMembers || agileMembers.length === 0) return null;
    
    // 确保进行字符串比较
    const memberAssignment = agileMembers.find(member => 
      member && 
      ((member.user_id && userId && member.user_id.toString() === userId.toString()) || 
       (member.id && userId && member.id.toString() === userId.toString()))
    );
        
    return memberAssignment ? memberAssignment.role_id : null;
  };
  
  // 打开分配角色对话框
  const openAssignRoleDialog = (member) => {
    // 确保统一使用正确的ID
    const memberId = member.id || member.user_id;
    setSelectedMember({
      ...member,
      id: memberId // 确保无论输入格式如何，都使用统一的id字段
    });
    setSelectedRole(getMemberRole(memberId));
    setDialogOpen(true);
  };
  
  // 分配角色
  const assignRole = async () => {
    if (!selectedMember || !selectedRole || !agileId) return;
    
    try {
      setError(null);
      setLoading(true); // 开始加载状态
      // 确保使用正确的ID字段
      const memberId = selectedMember.id || selectedMember.user_id;
      
      // 检查是否已经有角色分配
      const existingAssignment = agileMembers.find(member => 
        member && 
        ((member.user_id && selectedMember.id && member.user_id.toString() === selectedMember.id.toString()) || 
         (member.user_id && selectedMember.user_id && member.user_id.toString() === selectedMember.user_id.toString())) && 
        member.agile_id === agileId
      );
      
      let response;
      
      if (existingAssignment) {
        // 更新角色分配
        response = await fetch(`/api/teams/agile/member/${existingAssignment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            role_id: selectedRole
          }),
        });
      } else {
        // 创建新的角色分配
        response = await fetch('/api/teams/agile/member', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            agile_id: agileId,
            user_id: memberId,
            role_id: selectedRole,
            created_by: userId
          }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('roleAssignmentError'));
      }
      
      setDialogOpen(false);
      toast.success(`${selectedMember.name} ${t('assignedTo')} ${getRoleInfo(selectedRole)?.name || t('unknownRole')}`);
      
      // 如果提供了回调函数，调用它以更新父组件状态
      if (typeof onUpdateMembers === 'function') {
        onUpdateMembers();
      }
      setLoading(false); // 结束加载状态
      
    } catch (error) {
      console.error('角色分配失败:', error);
      setError(error.message);
      toast.error(t('roleAssignmentError'));
      setLoading(false); // 确保在错误情况下也结束加载状态
    }
  };
  
  // 创建新角色
  const createNewRole = async () => {
    // 验证表单
    const validationErrors = {};
    
    // 验证角色名称
    if (!newRoleName || newRoleName.trim() === '') {
      validationErrors.name = t('roleNameRequired');
    } else if (newRoleName.trim().length < 2) {
      validationErrors.name = t('roleNameMinLength');
    } else if (newRoleName.trim().length > 50) {
      validationErrors.name = t('roleNameMaxLength');
    }
    
    // 验证角色描述
    if (!newRoleDescription || newRoleDescription.trim() === '') {
      validationErrors.description = t('roleDescriptionRequired');
    } else if (newRoleDescription.trim().length < 10) {
      validationErrors.description = t('roleDescriptionMinLength');
    } else if (newRoleDescription.trim().length > 100) {
      validationErrors.description = t('roleDescriptionMaxLength');
    }
    
    // 如果有验证错误，显示错误并中断提交
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    if (!teamId) return;
    
    try {
      if (!userId) {
        console.error(t('createRoleFailedNoUserId'));
        throw new Error(t('noUserIdFound'));
      }
      
      setLoading(true); // 开始加载状态
      
      const roleData = { 
        team_id: teamId,
        name: getUniqueRoleName(newRoleName),
        description: newRoleDescription,
        created_by: userId
      };
            
      const response = await dispatch(createRole(roleData)).unwrap();
      
      // 获取API返回的新角色数据
      const newRole = response;
      
      // 将新创建的角色直接添加到本地角色列表，不等待父组件更新
      // 创建一个新的角色列表副本，包含新角色
      const updatedRoles = [...agileRoles];
      if (newRole && newRole.id) {
        // 检查角色是否已存在
        const roleExists = updatedRoles.some(role => role.id === newRole.id);
        if (!roleExists) {
          updatedRoles.push(newRole);
        }
      }
      
      setCreateRoleDialogOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      
      toast.success(t('roleCreatedSuccess'));
      
      // 调用父组件的更新函数来重新加载敏捷角色信息
      if (typeof onUpdateMembers === 'function') {
        onUpdateMembers();
      }
      
    } catch (error) {
      console.error(t('createRoleFailed'), error);
      toast.error(t('roleCreationError'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑角色
  const handleEditRole = (role) => {
    setRoleToEdit(role);
    setEditRoleDialogOpen(true);
  };
  
  // 提交编辑角色
  const handleUpdateRole = (roleData) => {
    if (!roleToEdit || !roleToEdit.id || !teamId) return;
    
    setLoading(true);
    
    dispatch(updateRole({
      roleId: roleToEdit.id,
      roleData,
      teamId
    }))
      .unwrap()
      .then(() => {
        toast.success(t('roleUpdatedSuccess'));
        setEditRoleDialogOpen(false);
        
        // 如果提供了回调函数，调用它以更新父组件状态
        if (typeof onUpdateMembers === 'function') {
          onUpdateMembers();
        }
      })
      .catch((error) => {
        console.error('更新角色失败:', error);
        toast.error(t('roleUpdateError'));
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // 处理删除角色
  const handleDeleteRole = (role) => {
    setRoleToDelete(role);
    setDeleteRoleDialogOpen(true);
  };
  
  // 确认删除角色
  const confirmDeleteRole = () => {
    if (!roleToDelete || !roleToDelete.id || !teamId) return;
    
    setLoading(true);
    
    dispatch(deleteRole({
      roleId: roleToDelete.id,
      teamId
    }))
      .unwrap()
      .then(() => {
        toast.success(t('roleDeletedSuccess'));
        setDeleteRoleDialogOpen(false);
        
        // 如果提供了回调函数，调用它以更新父组件状态
        if (typeof onUpdateMembers === 'function') {
          onUpdateMembers();
        }
      })
      .catch((error) => {
        console.error('删除角色失败:', error);
        toast.error(t('roleDeleteError'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 渲染角色分配表格
  const renderRoleAssignmentTable = () => {
    
    // 创建一个更强大的去重函数
    const getUniqueMembers = () => {
      // 使用多个键值进行匹配
      const membersByIds = new Map();
      const membersByEmails = new Map();
      const result = [];
      
      // 首先处理 teamMembers
      if (Array.isArray(teamMembers)) {
        teamMembers.forEach(member => {
          if (!member) return;
          
          const id = (member.id || member.user_id)?.toString();
          const email = member.email?.toLowerCase();
          
          if (id) membersByIds.set(id, member);
          if (email) membersByEmails.set(email, member);
          
          // 将成员添加到结果中
          result.push(member);
        });
      }
      
      // 然后处理 agileMembers，仅添加新成员
      if (Array.isArray(agileMembers)) {
        agileMembers.forEach(member => {
          if (!member) return;
          
          const id = (member.id || member.user_id)?.toString();
          const email = member.email?.toLowerCase();
          
          // 检查这个成员是否已经存在（通过ID或邮箱）
          if ((id && membersByIds.has(id)) || 
              (email && membersByEmails.has(email))) {
            return; // 已存在，跳过
          }
          
          // 这是新成员，添加到映射和结果中
          if (id) membersByIds.set(id, member);
          if (email) membersByEmails.set(email, member);
          result.push(member);
        });
      }
      
      return result;
    };
    
    // 获取去重后的成员列表
    const membersToRender = getUniqueMembers();
    
    // 如果没有任何成员数据，显示提示
    if (membersToRender.length === 0) {
      return (
        <div className="text-center py-8">
          <p>{t('noTeamMembers')}</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('member')}</TableHead>
            <TableHead>{t('role')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {membersToRender.map((member) => {
            if (!member) {
              console.error(t('invalidMemberNull'));
              return null; // 跳过无效成员
            }
            
            // 检测成员对象格式并适配
            const memberId = member.id || member.user_id;
            const memberName = member.name || t('unknownUser');
            const memberEmail = member.email || `ID: ${memberId}`;
            const memberAvatar = member.avatar || member.avatar_url;
            
            if (!memberId) {
              console.error(t('invalidMemberNoId'), member);
              return null; // 跳过无效成员
            }
            
            const roleId = getMemberRole(memberId);
            
            // 直接尝试从agileRoles中查找roleId
            let roleInfo = null;
            if (roleId) {
              roleInfo = agileRoles.find(role => role && role.id && roleId && role.id.toString() === roleId.toString());
            }
            
            return (
              <TableRow key={`member-${memberId}`}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      {memberAvatar && <AvatarImage src={memberAvatar} alt={memberName} />}
                      <AvatarFallback>{memberName ? memberName.charAt(0) : '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{memberName}</p>
                      <p className="text-sm text-gray-500">{memberEmail}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {roleInfo ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center cursor-help">
                          <span>{roleInfo.name}</span>
                          <Info className="ml-1 w-4 h-4 text-gray-500" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">{roleInfo.name}</h4>
                          <p className="text-sm">{roleInfo.description}</p>
                          
                          {ROLE_RESPONSIBILITIES[roleInfo.name?.toLowerCase().replace(/\s/g, '_')] && (
                            <>
                              <h5 className="font-medium text-sm">{t('responsibilities')}:</h5>
                              <ul className="text-sm space-y-1 list-disc pl-4">
                                {ROLE_RESPONSIBILITIES[roleInfo.name.toLowerCase().replace(/\s/g, '_')].map((resp, idx) => (
                                  <li key={`resp-${idx}`}>{resp}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className="text-gray-500">{t('noRole')}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={!isTeamCreator}
                    onClick={() => openAssignRoleDialog(member)}
                  >
                    <Pen className="w-4 h-4 mr-1" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };
  
  // 渲染创建角色对话框
  const renderCreateRoleDialog = () => (
    <Dialog open={createRoleDialogOpen} onOpenChange={(open) => {
      setCreateRoleDialogOpen(open);
      if (!open) {
        setFormErrors({});
        setNewRoleName('');
        setNewRoleDescription('');
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createNewRole')}</DialogTitle>
          <DialogDescription>{t('createNewRoleDescription')}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">{t('roleName')}</Label>
            <Input 
              id="roleName"
              value={newRoleName} 
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={t('roleNamePlaceholder')}
              maxLength={50}
            />
            <div className="flex justify-between">
              <div>
                {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
              </div>
              <div className="text-xs text-muted-foreground">
                {newRoleName ? String(newRoleName).trim().length : 0}/50
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roleDescription">{t('roleDescription')}</Label>
            <Textarea
              id="roleDescription"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder={t('roleDescriptionPlaceholder')}
              rows={4}
              maxLength={100}
            />
            <div className="flex justify-between">
              <div>
                {formErrors.description && <p className="text-sm text-destructive">{formErrors.description}</p>}
              </div>
              <div className="text-xs text-muted-foreground">
                {newRoleDescription ? String(newRoleDescription).trim().length : 0}/100
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateRoleDialogOpen(false)} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button onClick={createNewRole} disabled={loading} variant={themeColor}>
            {loading ? t('creating') || '创建中...' : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  // 渲染编辑角色对话框
  const renderEditRoleDialog = () => (
    <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editRole')}</DialogTitle>
          <DialogDescription>{t('editRoleDescription')}</DialogDescription>
        </DialogHeader>
        
        <div className="">
          {roleToEdit && (
            <RoleForm 
              initialValues={roleToEdit} 
              onSubmit={handleUpdateRole}
              loading={loading}
              teamId={teamId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
  
  // 渲染删除角色确认对话框
  const renderDeleteRoleDialog = () => (
    <AlertDialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteRoleConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteRoleConfirmDescription')}
            {roleToDelete && <strong className="block mt-2">{roleToDelete.name}</strong>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmDeleteRole}
            className="bg-red-600 hover:bg-red-700"
          >
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  
  // 渲染角色分配对话框
  const renderAssignRoleDialog = () => (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('assignRoleTo')} {selectedMember?.name}
          </DialogTitle>
          <DialogDescription>{t('assignRoleToDescription')}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Select 
            value={selectedRole ? selectedRole.toString() : ''} 
            onValueChange={setSelectedRole}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectRole')} />
            </SelectTrigger>
            <SelectContent>
              {agileRoles.map(role => (
                role && role.id && (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                )
              ))}
            </SelectContent>
          </Select>
          
          {selectedRole && (
            <div className="mt-4 text-sm">
              <p className="font-medium">{t('roleDescription')}:</p>
              <p className="mt-1">{getRoleInfo(selectedRole)?.description || ''}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-2 text-red-500 text-sm">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={assignRole} variant={themeColor}>
            {t('assign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <>
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium ml-2">{t('roleAssignment')}</h3>
            {isTeamCreator && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant={themeColor} 
                  size="sm"
                  onClick={() => setIsRoleInfoExpanded(!isRoleInfoExpanded)}
                >
                  <Info className="w-4 h-4 mr-1" />
                  {t('roleInfo')}
                  {isRoleInfoExpanded ? (
                    <ChevronUp className="ml-1 w-4 h-4" />
                  ) : (
                    <ChevronDown className="ml-1 w-4 h-4" />
                  )}
                </Button>
                
                <Button 
                  variant={themeColor} 
                  size="sm"
                  onClick={() => setCreateRoleDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('createRole')}
                </Button>
              </div>
            )}
          </div>
          
          {isRoleInfoExpanded && (
            <div className="mb-4 p-2 bg-slate-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agileRoles.map(role => (
                  role && role.id && (
                    <div key={role.id} className="p-2 bg-background border rounded-md relative">
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t('edit')}</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600" 
                          onClick={() => handleDeleteRole(role)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t('delete')}</span>
                        </Button>
                      </div>
                      <h5 className="font-medium pr-16">{role.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-md bg-background">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-9 w-32 rounded-md mr-2" />
                    <Skeleton className="h-9 w-9 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            renderRoleAssignmentTable()
          )}
          
          {renderAssignRoleDialog()}
          {renderCreateRoleDialog()}
          {renderEditRoleDialog()}
          {renderDeleteRoleDialog()}
        </Card>
    </>
  );
};

export default RoleAssignment; 