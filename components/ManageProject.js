//implement 3 dialog for each used to:
//edit project name, theme color and access
//edit project members

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, UserPlus, Trash2, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// 角色对应的中文名称
const roleLabels = {
  'OWNER': 'Owner',
  'CAN_EDIT': 'Member',
  'CAN_CHECK': 'Checker',
  'CAN_VIEW': 'Viewer'
};

// 角色对应的颜色
const roleColors = {
  'OWNER': 'text-purple-800',
  'CAN_EDIT': 'text-green-800',
  'CAN_CHECK': 'text-amber-800',
  'CAN_VIEW': 'text-blue-800'
};

// 主题颜色选项
const themeColorOptions = [
  { value: 'black', label: '黑色', hex: '#000000' },
  { value: 'orange', label: '橙色', hex: '#d76d2b' },
  { value: 'green', label: '绿色', hex: '#008000' },
  { value: 'blue', label: '蓝色', hex: '#3b6dbf' },
  { value: 'purple', label: '紫色', hex: '#5c4b8a' },
  { value: 'pink', label: '粉色', hex: '#d83c5e' },
  { value: 'red', label: '红色', hex: '#c72c41' }
  // { value: 'white', label: '白色', hex: '#ffffff' }
];

// 项目状态选项
const projectStatusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

// 将颜色名称转换为十六进制格式
const convertColorToHex = (colorName) => {
  // 预定义的常见颜色映射
  const colorMap = {
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'purple': '#800080',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'black': '#000000',
    'white': '#ffffff',
    'gray': '#808080',
    'orange': '#ffa500',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'lime': '#00ff00',
    'teal': '#008080',
    'navy': '#000080',
    'olive': '#808000'
  };
  
  // 如果颜色名称直接在映射中，返回对应的十六进制值
  if (colorName && typeof colorName === 'string') {
    const lowerColorName = colorName.toLowerCase();
    if (lowerColorName in colorMap) {
      return colorMap[lowerColorName];
    }
    
    // 如果已经是十六进制格式，直接返回
    if (lowerColorName.startsWith('#') && (lowerColorName.length === 4 || lowerColorName.length === 7)) {
      return lowerColorName;
    }
  }
  
  // 如果无法转换，返回默认值
  return '#3b82f6'; // 默认蓝色
};

// 获取颜色名称
const getColorName = (hexColor) => {
  if (!hexColor) return '';
  
  const colorMap = {
    '#ff0000': 'red',
    '#008000': 'green',
    '#0000ff': 'blue',
    '#ffff00': 'yellow',
    '#800080': 'purple',
    '#00ffff': 'cyan',
    '#ff00ff': 'magenta',
    '#000000': 'black',
    '#ffffff': 'white',
    '#808080': 'gray',
    '#ffa500': 'orange',
    '#ffc0cb': 'pink',
    '#a52a2a': 'brown',
    '#00ff00': 'lime',
    '#008080': 'teal',
    '#000080': 'navy',
    '#808000': 'olive'
  };
  
  const lowerHexColor = hexColor.toLowerCase();
  return colorMap[lowerHexColor] || '';
};

const ManageProject = ({ isOpen, onClose, projectId, activeTab = "general", setActiveTab, projectData, setProjectData }) => {
  const t  = useTranslations('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // 项目信息状态
  const [projectInfo, setProjectInfo] = useState({
    project_name: "",
    theme_color: "#000000",
    visibility: "private",
    status: "PENDING"
  });

  // 团队和成员相关状态
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  
  // 收集所有成员，根据团队进行分组
  const [processedMembers, setProcessedMembers] = useState([]);
  
  // 邀请新成员状态
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("CAN_VIEW");
  const [selectedTeam, setSelectedTeam] = useState("");
  
  // 存储原始颜色名称
  const [originalColorName, setOriginalColorName] = useState('');
  
  // 名称验证状态
  const [nameError, setNameError] = useState("");
  
  // 加载项目信息
  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      setError(null);
      
      // 使用传入的项目数据
      if (projectData) {
        const themeColor = projectData[0].theme_color || '';
        
        // 先检查是否是预定义的颜色名称
        const isColorName = themeColorOptions.some(option => 
          option.value.toLowerCase() === themeColor.toLowerCase()
        );
        
        if (isColorName) {
          // 如果是预定义颜色名称，保存原始名称
          setOriginalColorName(themeColor);
          
          // 找到对应的十六进制值
          const colorOption = themeColorOptions.find(option => 
            option.value.toLowerCase() === themeColor.toLowerCase()
          );
          
          setProjectInfo({
            project_name: projectData[0].project_name || "",
            theme_color: colorOption ? colorOption.hex : convertColorToHex(themeColor),
            visibility: projectData[0].visibility || "private",
            status: projectData[0].status || "PENDING"
          });
        } else {
          // 如果是十六进制值或其他格式
          if (themeColor && typeof themeColor === 'string' && !themeColor.startsWith('#')) {
            setOriginalColorName(themeColor);
          } else {
            setOriginalColorName('');
          }
          
          setProjectInfo({
            project_name: projectData[0].project_name || "",
            theme_color: convertColorToHex(themeColor) || "#3b82f6",
            visibility: projectData[0].visibility || "private",
            status: projectData[0].status || "active"
          });
        }
      }
      
      // 获取项目的所有团队
      fetchTeams();
    }
  }, [isOpen, projectId, projectData]);
  
  // 获取项目的所有团队
  const fetchTeams = async () => {
    try {
      const teamsData = await api.teams.listByProject(projectId);
      setTeams(teamsData);
      
      // 获取每个团队的成员
      const teamMembersObj = {};
      for (const team of teamsData) {
        const teamUsers = await api.teams.getTeamUsers(team.id);
        // 确保团队ID作为键时使用字符串类型
        teamMembersObj[String(team.id)] = teamUsers;
      }
      
      setTeamMembers(teamMembersObj);
      processAllMembers(teamMembersObj);
      setLoading(false);
    } catch (error) {
      console.error("获取项目团队失败:", error);
      setLoading(false);
    }
  };
  
  // 处理所有成员数据，按用户分组，展示所属的所有团队和角色
  const processAllMembers = (teamMembersObj) => {
    const userMap = new Map();
    
    // 遍历所有团队和团队成员
    Object.entries(teamMembersObj).forEach(([teamId, members]) => {      
      // 确保类型一致进行比较（将两者都转换为字符串）
      const team = teams.find(t => String(t.id) === String(teamId));
      const teamName = team ? team.name : `Team ${teamId}`;
      
      members.forEach(member => {
        const userId = member.user_id;
        const userInfo = member.user;
        
        if (userId && userInfo) {
          if (!userMap.has(userId)) {
            userMap.set(userId, {
              id: userId,
              name: userInfo.name,
              email: userInfo.email,
              avatar: userInfo.avatar_url,
              teams: [{
                teamId,
                teamName,
                role: member.role
              }]
            });
          } else {
            const user = userMap.get(userId);
            user.teams.push({
              teamId,
              teamName,
              role: member.role
            });
          }
        }
      });
    });
    
    // 转换为数组
    setProcessedMembers(Array.from(userMap.values()));
  };
  
  // 验证项目名称
  const validateProjectName = (name) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return t("Projects.projectNameTooShort");
    }
    if (trimmedName.length > 50) {
      return t("Projects.projectNameTooLong");
    }
    return "";
  };

  // 处理项目名称变更
  const handleProjectNameChange = (e) => {
    const newName = e.target.value;
    setProjectInfo({...projectInfo, project_name: newName});
    setNameError(validateProjectName(newName));
  };
  
  // 保存项目设置
  const handleSaveProject = async () => {
    try {
      // 验证项目名称
      const nameValidationError = validateProjectName(projectInfo.project_name);
      if (nameValidationError) {
        setNameError(nameValidationError);
        return;
      }
      
      setSaving(true);
      setError(null);
      
      // 准备要保存的数据
      const dataToSave = {
        ...projectInfo
      };
      
      // 如果有原始颜色名称，使用颜色名称而不是十六进制值
      if (originalColorName) {
        // 尝试找到对应的主题颜色选项
        const colorOption = themeColorOptions.find(option => option.value === originalColorName);
        if (colorOption && colorOption.hex.toLowerCase() === projectInfo.theme_color.toLowerCase()) {
          // 如果十六进制值匹配，使用颜色名称
          dataToSave.theme_color = originalColorName;
        }
      } else {
        // 尝试反向查找颜色名称
        const matchedColor = themeColorOptions.find(
          option => option.hex.toLowerCase() === projectInfo.theme_color.toLowerCase()
        );
        
        if (matchedColor) {
          // 如果找到匹配的预定义颜色，使用颜色名称
          dataToSave.theme_color = matchedColor.value;
        }
      }
      
      // 调用API更新项目信息
      const updatedProject = await api.projects.update(projectId, dataToSave);
            
      // 如果有设置项目数据的函数，更新父组件状态
      if (setProjectData && updatedProject) {
        // 使用原始的项目数据结构，只更新修改过的字段
        const updatedProjectData = projectData ? [...projectData] : [];
        
        if (updatedProjectData.length > 0) {
          // 更新第一个项目对象的属性
          updatedProjectData[0] = {
            ...updatedProjectData[0], 
            project_name: updatedProject.project_name,
            theme_color: updatedProject.theme_color,
            visibility: updatedProject.visibility,
            status: updatedProject.status
          };
        } else {
          // 如果原来没有项目数据，添加新的项目数据
          updatedProjectData.push(updatedProject);
        }
        
        // 更新父组件的状态
        setProjectData(updatedProjectData);
      }
      
      // 关闭对话框
      onClose();
    } catch (error) {
      console.error("更新项目失败:", error);
      setError(t("Projects.errorSavingProject"));
    } finally {
      setSaving(false);
    }
  };
  
  // 邀请成员到团队
  const handleInviteMember = async () => {
    if (!inviteEmail || !selectedTeam || !inviteRole) {
      return;
    }
    
    try {
      setSaving(true);
      await api.teams.teamInvitations.create({
        teamId: selectedTeam,
        userEmail: inviteEmail,
        role: inviteRole
      });
      
      // 清空邀请表单
      setInviteEmail("");
      
      // 刷新成员列表
      fetchTeams();
    } catch (error) {
      console.error("邀请团队成员失败:", error);

    } finally {
      setSaving(false);
    }
  };
  
  // 更新团队成员角色
  const handleUpdateMemberRole = async (teamId, userId, newRole) => {
    try {
      setSaving(true);
      await api.teams.updateTeamUser(teamId, userId, newRole);
      
      // 刷新成员列表
      fetchTeams();
    } catch (error) {
      console.error("更新成员角色失败:", error);
    } finally {
      setSaving(false);
    }
  };
  
  // 移除团队成员
  const handleRemoveMember = async (teamId, userId) => {
    if (!confirm(t("common.confirmDialog.deleteConfirmDesc"))) {
      return;
    }
    
    try {
      setSaving(true);
      // 调用API移除团队成员
      await api.teams.removeMember(teamId, userId);
      
      // 刷新成员列表
      fetchTeams();
    } catch (error) {
      console.error("移除团队成员失败:", error);
    } finally {
      setSaving(false);
    }
  };
  
  // 处理颜色选择
  const handleColorSelect = (colorValue) => {
    // 检查是否是颜色名称
    const colorOption = themeColorOptions.find(option => option.value === colorValue);
    
    if (colorOption) {
      // 更新主题颜色为十六进制值，并保存原始颜色名称以便后续使用
      setProjectInfo({...projectInfo, theme_color: colorOption.hex});
      setOriginalColorName(colorOption.value);
    } else {
      // 如果不是预定义颜色，直接使用传入值
      setProjectInfo({...projectInfo, theme_color: colorValue});
      setOriginalColorName('');
    }
  };
  
  // 获取当前选中的颜色选项
  const getSelectedColorOption = () => {
    // 首先检查是否有原始颜色名称（这是最准确的）
    if (originalColorName) {
      // 验证这个颜色名称是否在我们的选项中
      const isValidColor = themeColorOptions.some(option => 
        option.value.toLowerCase() === originalColorName.toLowerCase()
      );
      if (isValidColor) {
        return originalColorName;
      }
    }
    
    // 如果没有原始颜色名称，尝试匹配十六进制值
    const matchedColor = themeColorOptions.find(
      option => option.hex.toLowerCase() === projectInfo.theme_color.toLowerCase()
    );
    
    if (matchedColor) {
      return matchedColor.value;
    }
    
    // 没有匹配项返回默认值
    return 'blue';
  };

  // 使用useMemo计算按钮颜色，当主题颜色或原始颜色名称变化时重新计算
  const buttonColorVariant = useMemo(() => {
    return getSelectedColorOption();
  }, [projectInfo.theme_color, originalColorName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("Projects.manageProject")}</DialogTitle>
          <DialogDescription>
            {t("Projects.manageProjectDescription")}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="general">{t("Projects.general")}</TabsTrigger>
            <TabsTrigger value="members">{t("Projects.members")}</TabsTrigger>
          </TabsList>
          
          {/* 项目基本信息 */}
          <TabsContent value="general" className="space-y-4">
            {loading ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-3">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-3">
                      {Array(7).fill(0).map((_, i) => (
                        <Skeleton key={i} className="w-8 h-8 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-3">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-3">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-40 text-red-500">
                {error}
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project_name" className="text-right">
                    {t("Projects.projectName")}
                  </Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="project_name"
                      value={projectInfo.project_name}
                      onChange={handleProjectNameChange}
                      maxLength={50}
                      className={`${nameError ? "border-red-500" : ""}`}
                    />
                    <div className="flex justify-between mt-1 text-xs">
                      {nameError && <span className="text-red-500">{nameError}</span>}
                      <span className="ml-auto text-gray-500">{projectInfo.project_name.trim().length}/50</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="theme_color" className="text-right">
                    {t("Projects.themeColor")}
                  </Label>
                  <div className="col-span-3 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3">
                      {themeColorOptions.map((colorOption) => (
                        <Button
                          key={colorOption.value}
                          type="button"
                          variant={colorOption.value}
                          className={`w-8 h-8 p-0 rounded-full ${
                            (projectInfo.theme_color.toLowerCase() === colorOption.hex.toLowerCase() || 
                             (originalColorName && originalColorName.toLowerCase() === colorOption.value.toLowerCase()))
                              ? 'ring-2 ring-gray-400 dark:ring-gray-300' 
                              : ''
                          }`}
                          onClick={() => handleColorSelect(colorOption.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="visibility" className="text-right">
                    {t("Projects.visibility")}
                  </Label>
                  <Select
                    value={projectInfo.visibility}
                    onValueChange={(value) => setProjectInfo({...projectInfo, visibility: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t("Projects.public")}</SelectItem>
                      <SelectItem value="private">{t("Projects.private")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    {t("Projects.statusTitle")}
                  </Label>
                  <Select
                    value={projectInfo.status}
                    onValueChange={(value) => setProjectInfo({...projectInfo, status: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleSaveProject}
                variant={buttonColorVariant}
                disabled={saving || !projectInfo.project_name.trim() || nameError || loading || error}
              >
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          {/* 项目成员管理 */}
          <TabsContent value="members" className="space-y-6 h-[400px] overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-2">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-60" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* 项目成员列表 */}
                <div>                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Projects.member")}</TableHead>
                        <TableHead>{t("Projects.teams")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6">
                            {t("Projects.noMembersYet")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        processedMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{member.name || t("Projects.unnamed")}</div>
                                  <div className="text-sm text-muted-foreground">{member.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {member.teams.map((team, idx) => (
                                  <div key={`${member.id}-${team.teamId}-${idx}`} className="flex items-center gap-1">
                                    <span className="text-sm">{team.teamName}:</span>
                                    <Badge className={`${roleColors[team.role] || "text-gray-800 border border-none"} bg-transparent border-none cursor-default hover:bg-accent`}>
                                      {roleLabels[team.role] || team.role}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageProject;
