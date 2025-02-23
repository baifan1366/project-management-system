'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'use-intl'
import CreateTeamDialog from './TeamDialog'
import { fetchProjectById } from '@/lib/redux/features/projectSlice'
import { fetchProjectTeams, updateTeamOrder, initializeTeamOrder } from '@/lib/redux/features/teamSlice'
import { useDispatch, useSelector } from 'react-redux'
import { buttonVariants } from '@/components/ui/button'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useTheme } from 'next-themes'
import { Home, Search, Lock, Unlock, Eye, Pencil, Plus, Settings, Users, Bell, Archive, Zap, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectSidebar({ projectId }) {
  const t = useTranslations('Projects');
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { projects } = useSelector((state) => state.projects);
  const { teams, status } = useSelector((state) => state.teams);
  const project = projects.find(p => String(p.id) === String(projectId));
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // 过滤出当前项目的团队
  const projectTeams = teams.filter(team => String(team.project_id) === String(projectId));

  const menuItems = projectTeams.map((team, index) => ({
    ...team,
    id: team.id,
    label: team.name,
    href: `/projects/${projectId}/${team.id}`,
    icon: '👥',
    access: team.access,
    order_index: team.order_index || index
  })).sort((a, b) => a.order_index - b.order_index);

  // 加载项目和团队数据
  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectById(projectId));
      // 确保在项目ID变化时重新加载团队
      dispatch(fetchProjectTeams(projectId));
    }
  }, [dispatch, projectId]);

  // 检查是否需要初始化顺序
  useEffect(() => {
    if (projectTeams.length > 0 && projectTeams.every(team => !team.order_index || team.order_index === 0)) {
      dispatch(initializeTeamOrder(projectId));
    }
  }, [projectTeams, projectId, dispatch]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新每个项目的order值，保留原始团队的所有字段
    const updatedItems = items.map((item, index) => ({
      ...item,  // 保留所有原始字段
      order_index: index,  // 只更新order_index
    }));

    // 更新Redux状态
    dispatch(updateTeamOrder(updatedItems));
  };

  // 获取项目名称的首字母
  const getProjectInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 如果正在加载，显示加载状态
  if (status === 'loading') {
    return (
      <div className="w-64 bg-white h-screen p-4 shadow border-r border-gray-200 rounded-lg">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 h-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r text-gray-300">
      <div className="flex flex-col">
        {/* 项目名称下拉菜单 */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!isDropdownOpen)} 
            className="flex items-center w-full rounded-full px-4 py-2.5 text-gray-300 hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: project?.theme_color || '#E91E63' }}
              >
                {getProjectInitial(project?.project_name)}
              </div>
              <span className="text-sm">{project ? project.project_name : 'Workspace'}</span>
            </div>
            <span className="ml-auto">▼</span>
          </button>
          <div className={cn(
            "absolute left-0 right-0 mt-1 py-1 bg-[#252525] shadow-lg z-10",
            isDropdownOpen ? 'block' : 'hidden'
          )}>
            <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent/50 text-sm gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Upgrade</span>
            </Link>
            <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent/50 text-sm gap-2">
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
            <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent/50 text-sm gap-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </Link>
            <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent/50 text-sm gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </Link>
            <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent/50 text-sm gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <div className="my-1 border-t border-gray-700"></div>
            <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent/50 text-sm gap-2 text-red-500">
              <Archive className="h-4 w-4" />
              <span>Archive workspace</span>
            </Link>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#252525] text-gray-300 placeholder-gray-500 rounded text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* 导航链接 */}
        <nav className="mt-2">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center px-4 py-2 text-gray-300 hover:bg-accent/50"
          >
            <Home size={16} />
            <span className="ml-2 text-sm">Home</span>
          </Link>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="teams">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {menuItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                      <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center px-4 py-1.5 text-gray-300",
                                isActive ? "bg-accent/50" : "hover:bg-accent/50"
                              )}
                            >
                              <div className="flex items-center w-full">
                                <span className="text-sm">{item.label}</span>
                                {(() => {
                                  switch (item.access) {
                                    case 'invite_only':
                                      return <Lock className="ml-auto h-4 w-4 text-muted-foreground" />;
                                    case 'can_edit':
                                      return <Pencil className="ml-auto h-4 w-4 text-muted-foreground" />;
                                    case 'can_check':
                                      return <Eye className="ml-auto h-4 w-4 text-muted-foreground" />;
                                    case 'can_view':
                                      return <Unlock className="ml-auto h-4 w-4 text-muted-foreground" />;
                                    default:
                                      return <Lock className="ml-auto h-4 w-4 text-muted-foreground" />;
                                  }
                                })()}
                              </div>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </nav>

        {/* 创建团队按钮 */}
        <button 
          onClick={() => setDialogOpen(true)} 
          className="flex items-center w-full px-4 py-2 text-gray-300 hover:bg-accent/50"
        >
          <Plus className="h-4 w-4" />
          <span className="ml-2 text-sm">New folder</span>
        </button>
      </div>

      <CreateTeamDialog 
        isOpen={isDialogOpen} 
        onClose={() => setDialogOpen(false)} 
        projectId={projectId}
      />
    </div>
  )
} 