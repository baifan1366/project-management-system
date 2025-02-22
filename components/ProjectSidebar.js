'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'use-intl'
import CreateTeamDialog from './TeamDialog'
import { fetchProjectById } from '@/lib/redux/features/projectSlice'
import { fetchTeams } from '@/lib/redux/features/teamSlice'
import { useDispatch, useSelector } from 'react-redux'
import { buttonVariants } from '@/components/ui/button'

export default function ProjectSidebar({ projectId }) {
  const t = useTranslations('Projects');
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { projects } = useSelector((state) => state.projects);
  const { teams } = useSelector((state) => state.teams);
  const project = projects.find(p => String(p.id) === String(projectId));
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const menuItems = teams.map(team => ({
    id: team.id,
    label: team.name,
    href: `/projects/${projectId}/${team.id}`,
    icon: '👥'
  }));

  useEffect(() => {
    dispatch(fetchProjectById(projectId));
    dispatch(fetchTeams());
  }, [dispatch, projectId]);

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
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-50 text-gray-700 ${
                  isActive ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center w-full">
                  <span>{item.icon}</span>
                  <span className="ml-1 flex-1">{item.label}</span>
                  <span className="ml-auto" title="TooltipContent">🔒</span>
                </div>
              </Link>
            )
          })}
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
        />
      </div>
    </div>
  )
} 