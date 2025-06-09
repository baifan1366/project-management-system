import React, { useState, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { PlusIcon, Pencil, Eye, Play, Check } from "lucide-react";
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchTeamAgile, 
  createSprint, 
  startSprint, 
  completeSprint 
} from '../../../lib/redux/features/agileSlice';
import SprintForm from './SprintForm';
import { useGetUser } from '@/lib/hooks/useGetUser';

/**
 * 冲刺列表组件
 * 显示团队的所有冲刺
 * 使用Redux来管理状态和API调用
 */
const SprintList = ({ teamId, onViewDetails }) => {
  const dispatch = useDispatch();
  
  // 从Redux获取状态
  const sprints = useSelector(state => state.agiles.teamAgile);
  const teamAgileStatus = useSelector(state => state.agiles.teamAgileStatus);
  const createSprintStatus = useSelector(state => state.agiles.createSprintStatus);
  const startSprintStatus = useSelector(state => state.agiles.startSprintStatus);
  const completeSprintStatus = useSelector(state => state.agiles.completeSprintStatus);
  const error = useSelector(state => state.agiles.error);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentSprint, setCurrentSprint] = useState(null);
  const {user} = useGetUser();
  const userId = user?.id;
  // 加载状态判断
  const loading = teamAgileStatus === 'loading';
  const actionLoading = createSprintStatus === 'loading' || 
                        startSprintStatus === 'loading' || 
                        completeSprintStatus === 'loading';
  
  // 首次加载时获取数据
  useEffect(() => {
    if (teamId) {
      dispatch(fetchTeamAgile(teamId));
    }
  }, [dispatch, teamId]);
  
  // 错误处理
  useEffect(() => {
    if (error) {
      toast.error("错误", {
        description: error
      });
    }
  }, [error]);
  
  // 创建冲刺
  const handleCreateSprint = (sprintData) => {
    // 获取当前用户ID
    if (!userId) {
      toast.error("错误", {
        description: "无法获取当前用户ID"
      });
      return;
    }
    
    // 确保sprintData包含created_by字段
    const sprintDataWithCreator = {
      ...sprintData,
      created_by: userId
    };
        
    dispatch(createSprint(sprintDataWithCreator))
      .unwrap()
      .then(() => {
        toast.success("冲刺创建成功");
        setDialogOpen(false);
      })
      .catch((err) => {
        console.error('创建冲刺失败:', err);
        toast.error("创建冲刺失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 开始冲刺
  const handleStartSprint = (sprintId) => {
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
  const handleCompleteSprint = (sprintId) => {
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
  
  // 获取状态标签变体
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
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">冲刺列表</h2>
        <Button
          onClick={() => {
            setCurrentSprint(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          创建冲刺
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>开始日期</TableHead>
              <TableHead>持续天数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">正在加载...</TableCell>
              </TableRow>
            ) : sprints && sprints.length > 0 ? (
              sprints.map((sprint) => (
                <TableRow key={sprint.id}>
                  <TableCell>{sprint.name}</TableCell>
                  <TableCell>
                    {sprint.start_date ? moment(sprint.start_date).format('YYYY-MM-DD HH:mm') : '-'}
                  </TableCell>
                  <TableCell>{sprint.duration}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(sprint.status)}>
                      {getStatusText(sprint.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(sprint.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>查看详情</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {sprint.status === 'PENDING' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartSprint(sprint.id)}
                                disabled={actionLoading}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>开始冲刺</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {sprint.status === 'ACTIVE' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteSprint(sprint.id)}
                                disabled={actionLoading}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>完成冲刺</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">无冲刺数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建冲刺</DialogTitle>
          </DialogHeader>
          <SprintForm
            initialValues={currentSprint}
            onSubmit={handleCreateSprint}
            loading={actionLoading}
            teamId={teamId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SprintList; 