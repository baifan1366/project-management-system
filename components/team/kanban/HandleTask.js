'use client';

import { deleteTask, setSelectedTask } from '@/lib/redux/features/taskSlice';
import { useDispatch } from 'react-redux';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/hooks/use-confirm';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useSelector } from 'react-redux';
import { getSectionByTeamId, getSectionById, updateTaskIds } from '@/lib/redux/features/sectionSlice';


export default function HandleTask({ teamId }) {
    const dispatch = useDispatch();
    const t = useTranslations('CreateTask');
    const tConfirm = useTranslations('confirmation')
    const { confirm } = useConfirm();
    const { user } = useGetUser();
    const selectedTask = useSelector((state) => state.tasks?.selectedTask || null);

    const selectTask = (task) => {
        dispatch(setSelectedTask(task));
    };

    const DeleteTask = (columnId, taskId, onTaskDeleted) => {
        // 使用传入的任务ID或从选中任务中获取
        const taskToDelete = selectedTask || null;
        const taskIdToDelete = taskId || (taskToDelete ? taskToDelete.id : null);
                
        // 如果没有任务ID，则无法继续
        if (!taskIdToDelete) {
            console.error('没有选中任务或提供任务ID进行删除');
            return;
        }
        
        confirm({
            title: tConfirm('confirmDeleteTask'),
            description: `${tConfirm('task')} "${taskToDelete ? taskToDelete.content : taskIdToDelete}" ${tConfirm('willBeDeleted')}`,
            variant: 'error',
            onConfirm: async () => {
                try {
                    // 获取所有部分
                    const sectionsResult = await dispatch(getSectionByTeamId(teamId)).unwrap();
                    
                    // 检查每个部分是否包含要删除的任务ID
                    for (const section of sectionsResult) {
                        if (section.task_ids && section.task_ids.includes(parseInt(taskIdToDelete))) {
                            // 从task_ids数组中移除该任务ID
                            const updatedTaskIds = section.task_ids.filter(id => id !== parseInt(taskIdToDelete));
                            
                            // 更新部分的task_ids
                            await dispatch(updateTaskIds({
                                sectionId: section.id,
                                teamId: teamId,
                                newTaskIds: updatedTaskIds
                            }));
                        }
                    }
                    
                    // 删除任务
                    const deleteResult = await dispatch(deleteTask({
                        sectionId: columnId, 
                        userId: user?.id,
                        oldValues: taskToDelete,
                        taskId: taskIdToDelete,
                        teamId: teamId
                    })).unwrap();
                    
                    
                    // 如果提供了删除后的回调函数，则调用它
                    if (typeof onTaskDeleted === 'function') {
                        onTaskDeleted();
                    }
                } catch (error) {
                    console.error("删除任务时出错:", error);
                } finally {
                    // 操作完成后清除选中的任务
                    dispatch(setSelectedTask(null));
                }
            }
        });
    }
    return{
        DeleteTask,
        selectTask
    };
}