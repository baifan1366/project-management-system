import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Play, Check, Users, Edit } from "lucide-react";
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSelectedTeamAgileById, 
  fetchAgileMembers, 
  startSprint,
  completeSprint,
  updateSprint,
  assignRole,
  addWhatWentWell,
  deleteWhatWentWell,
  addToImprove,
  deleteToImprove
} from '../../../lib/redux/features/agileSlice';
import SprintForm from './SprintForm';
import AssignRoleForm from './AssignRoleForm';
import RetrospectiveForm from './RetrospectiveForm';
import RoleList from './RoleList';

/**
 * 冲刺详情组件
 * 显示冲刺的详细信息和相关操作
 * 使用Redux来管理状态和API调用
 */
const SprintDetail = ({ sprintId, teamId, onBack }) => {
  const dispatch = useDispatch();
  
  // 从Redux获取状态
  const sprintData = useSelector(state => state.agiles.selectedAgileDetail);
  const members = useSelector(state => state.agiles.agileMembers);
  const selectedAgileDetailStatus = useSelector(state => state.agiles.selectedAgileDetailStatus);
  const agileMembersStatus = useSelector(state => state.agiles.agileMembersStatus);
  const startSprintStatus = useSelector(state => state.agiles.startSprintStatus);
  const completeSprintStatus = useSelector(state => state.agiles.completeSprintStatus);
  const updateSprintStatus = useSelector(state => state.agiles.updateSprintStatus);
  const assignRoleStatus = useSelector(state => state.agiles.assignRoleStatus);
  const error = useSelector(state => state.agiles.error);
  
  // 对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  
  // 加载状态判断
  const loading = selectedAgileDetailStatus === 'loading' || agileMembersStatus === 'loading';
  const actionLoading = startSprintStatus === 'loading' || 
                      completeSprintStatus === 'loading' || 
                      updateSprintStatus === 'loading' ||
                      assignRoleStatus === 'loading';
  
  // 首次加载时获取数据
  useEffect(() => {
    if (sprintId) {
      dispatch(fetchSelectedTeamAgileById(sprintId));
      dispatch(fetchAgileMembers(sprintId));
    }
  }, [dispatch, sprintId]);
  
  // 错误处理
  useEffect(() => {
    if (error) {
      toast.error("错误", {
        description: error
      });
    }
  }, [error]);
  
  // 开始冲刺
  const handleStartSprint = () => {
    dispatch(startSprint({ sprintId, teamId }))
      .unwrap()
      .then(() => {
        toast.success("冲刺已开始");
      })
      .catch((err) => {
        console.error('开始冲刺失败:', err);
        toast.error("开始冲刺失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 完成冲刺
  const handleCompleteSprint = () => {
    dispatch(completeSprint({ sprintId, teamId }))
      .unwrap()
      .then(() => {
        toast.success("冲刺已完成");
      })
      .catch((err) => {
        console.error('完成冲刺失败:', err);
        toast.error("完成冲刺失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 更新冲刺
  const handleUpdateSprint = (sprintData) => {
    dispatch(updateSprint({ sprintId, sprintData, teamId }))
      .unwrap()
      .then(() => {
        toast.success("冲刺更新成功");
        setEditDialogOpen(false);
      })
      .catch((err) => {
        console.error('更新冲刺失败:', err);
        toast.error("更新冲刺失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 分配角色
  const handleAssignRole = (memberData) => {
    dispatch(assignRole(memberData))
      .unwrap()
      .then(() => {
        toast.success("角色分配成功");
        setAssignRoleDialogOpen(false);
      })
      .catch((err) => {
        console.error('分配角色失败:', err);
        toast.error("分配角色失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 添加"进展顺利"
  const handleAddWhatWentWell = (content) => {
    dispatch(addWhatWentWell({ sprintId, content }))
      .unwrap()
      .then(() => {
        toast.success("添加成功");
      })
      .catch((err) => {
        console.error('添加进展顺利失败:', err);
        toast.error("添加失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 删除"进展顺利"
  const handleDeleteWhatWentWell = (index) => {
    dispatch(deleteWhatWentWell({ sprintId, index }))
      .unwrap()
      .then(() => {
        toast.success("删除成功");
      })
      .catch((err) => {
        console.error('删除进展顺利失败:', err);
        toast.error("删除失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 添加"待改进"
  const handleAddToImprove = (content) => {
    dispatch(addToImprove({ sprintId, content }))
      .unwrap()
      .then(() => {
        toast.success("添加成功");
      })
      .catch((err) => {
        console.error('添加待改进失败:', err);
        toast.error("添加失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 删除"待改进"
  const handleDeleteToImprove = (index) => {
    dispatch(deleteToImprove({ sprintId, index }))
      .unwrap()
      .then(() => {
        toast.success("删除成功");
      })
      .catch((err) => {
        console.error('删除待改进失败:', err);
        toast.error("删除失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 获取状态变体
  const getStatusVariant = (status) => {
    const statusMap = {
      'PLANNING': 'default',
      'PENDING': 'secondary',
      'ACTIVE': 'success',
      'RETROSPECTIVE': 'purple',
      'COMPLETED': 'outline'
    };
    return statusMap[status] || 'default';
  };
  
  // 获取状态文本
  const getStatusText = (status) => {
    const statusMap = {
      'PLANNING': '计划中',
      'PENDING': '待开始',
      'ACTIVE': '进行中',
      'RETROSPECTIVE': '回顾中',
      'COMPLETED': '已完成'
    };
    return statusMap[status] || status;
  };
  
  if (loading && !sprintData) {
    return <div className="flex items-center justify-center p-8">加载中...</div>;
  }
  
  if (!sprintData) {
    return <div className="flex items-center justify-center p-8">未找到冲刺数据</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl">{sprintData.name}</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              编辑
            </Button>
            {sprintData.status === 'PENDING' && (
              <Button 
                size="sm"
                onClick={handleStartSprint}
                disabled={actionLoading}
              >
                <Play className="mr-2 h-4 w-4" />
                开始冲刺
              </Button>
            )}
            {sprintData.status === 'ACTIVE' && (
              <Button 
                size="sm"
                onClick={handleCompleteSprint}
                disabled={actionLoading}
              >
                <Check className="mr-2 h-4 w-4" />
                完成冲刺
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium">状态</p>
              <Badge variant={getStatusVariant(sprintData.status)}>
                {getStatusText(sprintData.status)}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">开始日期</p>
              <p>{sprintData.start_date ? moment(sprintData.start_date).format('YYYY-MM-DD HH:mm') : '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">持续天数</p>
              <p>{sprintData.duration || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">创建者</p>
              <p>{sprintData.created_by || '-'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium">冲刺目标</p>
            <p className="mt-1">{sprintData.goal || '-'}</p>
          </div>
          
          <Separator className="my-4" />
          
          <Tabs defaultValue="members" className="mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="members">团队成员</TabsTrigger>
              <TabsTrigger value="retrospective">回顾</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members">
              <div className="mb-4">
                <Button onClick={() => setAssignRoleDialogOpen(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  分配角色
                </Button>
              </div>
              <RoleList 
                teamId={teamId} 
                agileId={sprintId} 
                members={members}
                onMembersChange={() => dispatch(fetchAgileMembers(sprintId))}
              />
            </TabsContent>
            
            <TabsContent value="retrospective">
              <div className="space-y-4">
                <RetrospectiveForm 
                  sprintId={sprintId} 
                  whatWentWell={sprintData.what_went_well || []} 
                  toImprove={sprintData.to_improve || []}
                  onAddWhatWentWell={handleAddWhatWentWell}
                  onDeleteWhatWentWell={handleDeleteWhatWentWell}
                  onAddToImprove={handleAddToImprove}
                  onDeleteToImprove={handleDeleteToImprove}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 编辑冲刺对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑冲刺</DialogTitle>
          </DialogHeader>
          <SprintForm
            initialValues={sprintData}
            onSubmit={handleUpdateSprint}
            loading={actionLoading}
            teamId={teamId}
          />
        </DialogContent>
      </Dialog>
      
      {/* 分配角色对话框 */}
      <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分配角色</DialogTitle>
          </DialogHeader>
          <AssignRoleForm
            onSubmit={handleAssignRole}
            loading={actionLoading}
            teamId={teamId}
            agileId={sprintId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SprintDetail; 