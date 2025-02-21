'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { fetchProjects, updateProjectOrder } from '@/lib/redux/features/projectSlice';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ProjectsPage() {
  const t = useTranslations('Projects');
  const router = useRouter();
  const dispatch = useDispatch();
  const projects = useSelector((state) => state.projects.projects) || [];

  useEffect(() => {
    const readProjects = async () => {
      dispatch(fetchProjects());
    };
    readProjects();
  }, [dispatch]);

  const onDragEnd = (result) => {
    // 检查拖放结果是否有效
    if (!result.destination) {
      return; // 如果没有目标位置，直接返回
    }

    const reorderedProjects = Array.from(projects); // 创建项目数组的副本
    const [movedProject] = reorderedProjects.splice(result.source.index, 1); // 移动被拖动的项目
    reorderedProjects.splice(result.destination.index, 0, movedProject); // 将项目插入到目标位置
    // 更新项目状态（假设你有一个更新项目顺序的 action）
    dispatch(updateProjectOrder(reorderedProjects)); // 取消注释并实现此行以更新状态
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('projects')}</h1>
        <button 
          onClick={() => router.push('/createProject')}
          className="btn bg-primary text-white px-4 py-2 rounded-md">
          {t('createProject')}
        </button>
      </div>


      {/* 项目过滤器 */}
      <div className="flex gap-4 mb-6">
        <button className="text-sm px-4 py-2 rounded-md bg-primary/10 text-primary">
          {t('all')}
        </button>
        <button className="text-sm px-4 py-2 rounded-md hover:bg-primary/5">
          {t('active')}
        </button>
        <button className="text-sm px-4 py-2 rounded-md hover:bg-primary/5">
          {t('completed')}
        </button>
      </div>

      {/* 项目列表 */}
      <div className="grid gap-6">
        {/* 示例项目卡片 */}
        <div className="border rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">网站重构项目</h2>
              <p className="text-sm text-muted-foreground">{t('team')}: 开发团队</p>
            </div>
            <span className="px-2 py-1 text-sm bg-green-100 text-green-800 rounded">
              {t('inProgress')}
            </span>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{t('progress')}</span>
              <span>65%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{width: '65%'}}></div>
            </div>
          </div>
        </div>

        {/* 项目数据表格 */}
        <div className="text-center border rounded-lg">
          <table className="min-w-full border-collapse border border-gray-200">
            <thead>
              <tr>
                <th className="border px-4 py-2">{t('projectID')}</th>
                <th className="border px-4 py-2">{t('projectName')}</th>
                <th className="border px-4 py-2">{t('visibility')}</th>
                <th className="border px-4 py-2">{t('created_at')}</th>
                <th className="border px-4 py-2">{t('updated_at')}</th>
                <th className="border px-4 py-2"></th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="projects">
                {(provided) => (
                  <tbody ref={provided.innerRef} {...provided.droppableProps}>
                    {projects.length > 0 ? (
                      projects.map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id.toString()} index={index}>
                          {(provided) => (
                            <tr ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <td className="border px-4 py-2">{project.id}</td>
                              <td className="border px-4 py-2">{project.project_name}</td>
                              <td className="border px-4 py-2">{project.visibility}</td>
                              <td className="border px-4 py-2">{project.created_at}</td>
                              <td className="border px-4 py-2">{project.updated_at}</td>
                              <td className="border px-4 py-2">
                                <button 
                                  onClick={() => {
                                    if (project && project.id) {
                                      router.push(`/projects/${project.id}`);
                                    } 
                                  }}
                                  className={`btn text-white px-2 rounded-md`}
                                  style={{ backgroundColor: project.theme_color }}>
                                  View
                                </button>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center border px-4 py-2">
                          {t('noProjects')}
                        </td>
                      </tr>
                    )}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
          </table>
        </div>
      </div>
    </div>
  );
} 