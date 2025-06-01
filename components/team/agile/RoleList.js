import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Edit, Trash, Plus } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchAgileRoles, 
  createRole, 
  updateRole, 
  deleteRole, 
  deleteMember 
} from '../../../lib/redux/features/agileSlice';
import RoleForm from './RoleForm';

/**
 * 角色列表组件
 * 显示团队的角色和成员
 * 使用Redux来管理状态和API调用
 */
const RoleList = ({ teamId, agileId, members = [], onMembersChange }) => {
  const dispatch = useDispatch();
  
  // 从Redux获取状态
  const roles = useSelector(state => state.agiles.agileRoles);
  const agileRolesStatus = useSelector(state => state.agiles.agileRolesStatus);
  const createRoleStatus = useSelector(state => state.agiles.createRoleStatus);
  const updateRoleStatus = useSelector(state => state.agiles.updateRoleStatus);
  const deleteRoleStatus = useSelector(state => state.agiles.deleteRoleStatus);
  const deleteMemberStatus = useSelector(state => state.agiles.deleteMemberStatus);
  const error = useSelector(state => state.agiles.error);
  
  const [users, setUsers] = useState([]);
  
  // 弹窗状态
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [memberDeleteDialogOpen, setMemberDeleteDialogOpen] = useState(false);
  
  // 加载状态判断
  const loading = agileRolesStatus === 'loading';
  const actionLoading = createRoleStatus === 'loading' || 
                      updateRoleStatus === 'loading' || 
                      deleteRoleStatus === 'loading' ||
                      deleteMemberStatus === 'loading';
  
  // 首次加载时获取数据
  useEffect(() => {
    if (teamId) {
      dispatch(fetchAgileRoles(teamId));
      fetchUsers();
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
  
  // 获取团队成员
  const fetchUsers = async () => {
    if (!teamId) return;
    
    try {
      const response = await fetch(`/api/teams/teamUsers?id=${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('获取团队成员失败:', error);
      toast.error("获取团队成员失败");
    }
  };
  
  // 创建角色
  const handleCreateRole = (roleData) => {
    dispatch(createRole(roleData))
      .unwrap()
      .then(() => {
        toast.success("角色创建成功");
        setRoleDialogOpen(false);
      })
      .catch((err) => {
        console.error('创建角色失败:', err);
        toast.error("创建角色失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 更新角色
  const handleUpdateRole = (roleData) => {
    dispatch(updateRole({
      roleId: currentRole.id,
      roleData,
      teamId
    }))
      .unwrap()
      .then(() => {
        toast.success("角色更新成功");
        setRoleDialogOpen(false);
      })
      .catch((err) => {
        console.error('更新角色失败:', err);
        toast.error("更新角色失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 删除角色
  const handleDeleteRole = () => {
    if (!roleToDelete) return;
    
    dispatch(deleteRole({ roleId: roleToDelete.id, teamId }))
      .unwrap()
      .then(() => {
        toast.success("角色删除成功");
        setDeleteDialogOpen(false);
      })
      .catch((err) => {
        console.error('删除角色失败:', err);
        toast.error("删除角色失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 删除成员角色
  const handleDeleteMember = () => {
    if (!memberToDelete) return;
    
    dispatch(deleteMember({ memberId: memberToDelete.id, agileId }))
      .unwrap()
      .then(() => {
        toast.success("成员角色删除成功");
        setMemberDeleteDialogOpen(false);
        if (onMembersChange) {
          onMembersChange();
        }
      })
      .catch((err) => {
        console.error('删除成员角色失败:', err);
        toast.error("删除成员角色失败", {
          description: err || '未知错误'
        });
      });
  };
  
  // 根据ID获取用户信息
  const getUserById = (userId) => {
    const user = users.find(u => u.user_id === userId);
    return user ? (user.user_name || user.user_email || user.user_id) : userId;
  };
  
  // 根据ID获取角色信息
  const getRoleById = (roleId) => {
    const role = roles.find(r => r.id && r.id.toString() === roleId.toString());
    return role ? role.name : roleId;
  };
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">角色分配</TabsTrigger>
          <TabsTrigger value="roles">角色管理</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">加载中...</TableCell>
                  </TableRow>
                ) : members && members.length > 0 ? (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{getUserById(member.user_id)}</TableCell>
                      <TableCell>{getRoleById(member.role_id)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoading}
                          onClick={() => {
                            setMemberToDelete(member);
                            setMemberDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">暂无分配角色的成员</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="roles">
          <div className="mb-4">
            <Button
              onClick={() => {
                setCurrentRole(null);
                setRoleDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              创建角色
            </Button>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>角色名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">加载中...</TableCell>
                  </TableRow>
                ) : roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>{role.name}</TableCell>
                      <TableCell>{role.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentRole(role);
                              setRoleDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRoleToDelete(role);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">暂无角色数据</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 角色表单对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentRole ? '编辑角色' : '创建角色'}</DialogTitle>
          </DialogHeader>
          <RoleForm
            initialValues={currentRole}
            onSubmit={currentRole ? handleUpdateRole : handleCreateRole}
            loading={actionLoading}
            teamId={teamId}
          />
        </DialogContent>
      </Dialog>
      
      {/* 删除角色确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除角色吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除角色，无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole}>
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 删除成员角色确认对话框 */}
      <AlertDialog open={memberDeleteDialogOpen} onOpenChange={setMemberDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定移除这个成员的角色吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将移除该成员的角色，无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember}>
              确定移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RoleList; 