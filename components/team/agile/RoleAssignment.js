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
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { toast } from 'sonner';
import { Plus, Info, Check, Pen, Settings, ChevronDown, ChevronUp } from 'lucide-react';

// 敏捷角色定义
const AGILE_ROLES = [
  {
    id: 'product_owner',
    name: '产品负责人',
    description: '负责确定产品方向，管理产品待办事项，确保团队交付最大价值。'
  },
  {
    id: 'scrum_master',
    name: 'Scrum 主管',
    description: '确保Scrum过程被理解和执行，消除障碍，促进团队自组织和高效运作。'
  },
  {
    id: 'dev_team',
    name: '开发团队',
    description: '负责在每个冲刺中交付可发布的产品增量。团队成员拥有跨职能技能，能够完成所有开发工作。'
  },
  {
    id: 'qa',
    name: '质量保证',
    description: '负责确保产品质量，编写和执行测试用例，识别和报告缺陷。'
  },
  {
    id: 'ux_designer',
    name: 'UX设计师',
    description: '负责用户体验和界面设计，确保产品易于使用且符合用户需求。'
  },
  {
    id: 'stakeholder',
    name: '利益相关者',
    description: '提供需求和反馈，但不直接参与日常开发过程。'
  }
];

// 角色职责简述
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

const RoleAssignment = ({ teamId, projectId }) => {
  const t = useTranslations('Agile');
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberRoles, setMemberRoles] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isRoleInfoExpanded, setIsRoleInfoExpanded] = useState(false);

  // 获取团队成员
  useEffect(() => {
    if (teamId && projectId) {
      // 这里应该从数据库获取团队成员和角色分配
      // fetchTeamMembers(teamId, projectId);
      
      // 模拟数据
      const mockMembers = [
        { id: 1, name: '张三', email: 'zhangsan@example.com', avatar: null, role: 'admin' },
        { id: 2, name: '李四', email: 'lisi@example.com', avatar: null, role: 'member' },
        { id: 3, name: '王五', email: 'wangwu@example.com', avatar: null, role: 'member' },
        { id: 4, name: '赵六', email: 'zhaoliu@example.com', avatar: null, role: 'member' },
        { id: 5, name: '孙七', email: 'sunqi@example.com', avatar: null, role: 'member' }
      ];
      
      // 模拟角色分配
      const mockRoles = {
        1: 'product_owner',
        2: 'scrum_master',
        3: 'dev_team',
        4: 'qa',
        5: 'ux_designer'
      };
      
      setTeamMembers(mockMembers);
      setMemberRoles(mockRoles);
      setLoading(false);
    }
  }, [teamId, projectId]);

  // 获取角色信息
  const getRoleInfo = (roleId) => {
    return AGILE_ROLES.find(role => role.id === roleId) || null;
  };
  
  // 打开分配角色对话框
  const openAssignRoleDialog = (member, currentRoleId) => {
    setSelectedMember(member);
    setSelectedRole(currentRoleId);
    setDialogOpen(true);
  };
  
  // 分配角色
  const assignRole = () => {
    if (!selectedMember || !selectedRole) return;
    
    // 更新角色
    const newMemberRoles = {
      ...memberRoles,
      [selectedMember.id]: selectedRole
    };
    
    setMemberRoles(newMemberRoles);
    setDialogOpen(false);
    
    // 在实际应用中，这里应该调用API保存角色分配
    toast.success(`${selectedMember.name} ${t('assignedTo')} ${getRoleInfo(selectedRole).name}`);
  };
  
  // 渲染角色分配对话框
  const renderAssignRoleDialog = () => (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('assignRoleTo')} {selectedMember?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Select 
            value={selectedRole} 
            onValueChange={setSelectedRole}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectRole')} />
            </SelectTrigger>
            <SelectContent>
              {AGILE_ROLES.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  {(role.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedRole && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">{t('roleResponsibilities')}:</h4>
              <ul className="text-sm space-y-1">
                {ROLE_RESPONSIBILITIES[selectedRole].map((resp, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
                    <span>{(resp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setDialogOpen(false)}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={assignRole} 
            disabled={!selectedRole}
          >
            {t('assign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full p-6">
          <p className="text-center">{t('loading')}</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* 团队成员角色分配 */}
      <Card className="p-4">
        <div className="flex items-center cursor-pointer justify-between" onClick={() => setIsRoleInfoExpanded(!isRoleInfoExpanded)}>
          <div className="flex items-center justify-normal">
            <div className="flex items-center">
                {isRoleInfoExpanded ? (
                <ChevronUp className="h-5 w-5 mr-2" />
              ) : (
                <ChevronDown className="h-5 w-5 mr-2" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('roleAssignment')}</h2>
            </div>
          </div>
          <div className="flex">
            <div className="flex justify-end">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                {t('manageAgileRoles')}
              </Button>
            </div>
          </div>
        </div>
        {isRoleInfoExpanded && (

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('member')}</TableHead>
                <TableHead>{t('currentRole')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map(member => {
                const roleId = memberRoles[member.id];
                const role = getRoleInfo(roleId);
                
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          {member.avatar && (
                            <AvatarImage src={member.avatar} />
                          )}
                          <AvatarFallback>
                            {member.name.substring(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {role ? (
                        <div className="flex items-center">
                          <span>{(role.name)}</span>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                                <Info className="h-4 w-4" />
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium">{(role.name)} {t('responsibilities')}:</h4>
                                <ul className="text-sm space-y-1">
                                  {ROLE_RESPONSIBILITIES[role.id].map((resp, index) => (
                                    <li key={index} className="flex items-start">
                                      <Check className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
                                      <span>{(resp)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('unassigned')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAssignRoleDialog(member, roleId)}
                      >
                        {role ? t('change') : t('assign')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
      
      {renderAssignRoleDialog()}
    </div>
  );
};

export default RoleAssignment; 