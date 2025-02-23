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

  // 如果正在加载，显示加载状态
  if (status === 'loading') {
    return (
      <div className="w-64 bg-white h-screen p-4 shadow border-r border-gray-200 rounded-lg">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white h-screen p-4 shadow border-r border-gray-200 rounded-lg">
      <div className="flex flex-col space-y-4">
        {/* 项目名称下拉菜单 */}
        <div className={`relative`}>
          <button onClick={() => setDropdownOpen(!isDropdownOpen)} className={`flex items-center text-gray-700 w-full border border-transparent rounded-lg px-2 transition-colors duration-200 hover:bg-gray-50 hover:border-gray-200`}>
            <span>{project ? project.project_name : ''}</span>
            <span className="ml-auto">▼</span>
          </button>
          <div className={`absolute px-2 bg-white text-gray-700 mt-1 rounded-lg shadow-md border border-gray-200 transition-opacity duration-200 ${isDropdownOpen ? 'opacity-100 border-t-0' : 'opacity-0 pointer-events-none'} w-full`}>
            <Link href="#" className="block p-2 hover:bg-gray-50">{t('edit')}</Link>
            <Link href="#" className="block p-2 hover:bg-gray-50">{t('members')}</Link>
            <Link href="#" className="block p-2 hover:bg-gray-50">{t('notifications')}</Link>
            <Link href="#" className="block p-2 hover:bg-gray-50">{t('settings')}</Link>
            <Link href="#" className="block p-2 hover:bg-gray-50">{t('archiveProject')}</Link>
          </div>
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="Search..."
          className="px-2 rounded-lg bg-gray-50 text-gray-700 border border-gray-200"
        />

        {/* 导航链接 */}
        <nav className="space-y-2">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-50 text-gray-700"
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="teams">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-1"
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
                              className={`flex items-center space-x-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-50 text-gray-700 ${
                                isActive ? 'bg-gray-50' : ''
                              }`}
                            >
                              <div className="flex items-center w-full">
                                <span>{item.icon}</span>
                                <span className="ml-1 flex-1">{item.label}</span>
                                {(() => {
                                  switch (item.access) {
                                    case 'invite_only':
                                      return <span className="ml-auto" title="Invite Only">🔒</span>;
                                    case 'can_edit':
                                      return <span className="ml-auto" title="Can Edit">🔓</span>;
                                    case 'can_check':
                                      return <span className="ml-auto" title="Can Check">🔍</span>;
                                    case 'can_view':
                                      return <span className="ml-auto" title="Can View">🔑</span>;
                                    default:
                                      return <span className="ml-auto" title="No Access">🔒</span>;
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
        <div className="mt-4">
          <button 
            onClick={() => setDialogOpen(true)} 
            className={buttonVariants({
              variant: project?.theme_color?.toLowerCase() || 'default',
              className: 'w-full'
            })}>
              {t('createTeam')}
          </button>
        </div>
        <CreateTeamDialog 
          isOpen={isDialogOpen} 
          onClose={() => setDialogOpen(false)} 
          projectId={projectId}
        />
      </div>
    </div>
  )
} 