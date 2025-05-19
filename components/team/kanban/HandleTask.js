'use client';

import { deleteTask, setSelectedTask, updateTask, fetchTaskById, createTask } from '@/lib/redux/features/taskSlice';
import { useDispatch } from 'react-redux';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/hooks/use-confirm';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useSelector } from 'react-redux';
import { getSectionByTeamId, updateTaskIds } from '@/lib/redux/features/sectionSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { supabase } from '@/lib/supabase';


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

    const CreateTask = async(taskData, onTaskCreated) => {
        console.log('创建新任务:', taskData);
        
        try {
            // 获取任务名称的Tag ID
            const tagIdName = await dispatch(getTagByName("Name")).unwrap();
            console.log('Name标签ID:', tagIdName);
            
            // 准备要创建的任务数据 - 只包含 task 表中实际存在的字段
            const newTaskData = {
                tag_values: {
                    [tagIdName]: taskData.content
                },
                created_by: user?.id
            };
            
            console.log('准备创建的任务数据:', newTaskData);
            
            // 创建任务
            const result = await dispatch(createTask(newTaskData)).unwrap();
            //it may also create a notion_page, then update the notion_page id into the task table, page_id column
            const { data: notionPageData, error: notionPageError } = await supabase
            .from('notion_page')
            .insert({
                created_by: user?.id,
                last_edited_by: user?.id
            })
            .select()
            .single();
            console.log(notionPageData);
            //update the notion_page id into the task table, page_id column
            const { data: taskDbData, error: taskError } = await supabase
            .from('task')
            .update({
                page_id: notionPageData.id
            })
            .eq('id', result.id);
            console.log(taskDbData);
            
            // 如果任务创建成功且有分区ID，则将任务添加到分区的 task_ids 中
            if (result && result.id && taskData.sectionId) {
                try {
                    // 获取分区数据
                    const sectionsResult = await dispatch(getSectionByTeamId(teamId)).unwrap();
                    
                    // 找到对应的分区
                    const section = sectionsResult.find(s => 
                        s.id === parseInt(taskData.sectionId) || 
                        s.id === taskData.sectionId
                    );
                    
                    if (section) {
                        // 添加新任务ID到task_ids数组
                        const updatedTaskIds = [...(section.task_ids || []), result.id];
                        
                        // 使用updateTaskIds更新分区的task_ids数组
                        await dispatch(updateTaskIds({
                            sectionId: section.id,
                            teamId: teamId,
                            newTaskIds: updatedTaskIds
                        })).unwrap();
                        
                        console.log(`已将任务 ${result.id} 添加到分区 ${section.id} 的task_ids中`);
                    } else {
                        console.error(`未找到ID为 ${taskData.sectionId} 的分区`);
                    }
                } catch (error) {
                    console.error('将任务添加到分区时出错:', error);
                }
            }
            
            // 如果提供了创建后的回调函数，则调用它
            if (typeof onTaskCreated === 'function') {
                onTaskCreated(result);
            }
            
            return result;
        } catch (error) {
            console.error('创建任务时出错:', error);
            throw error; // 抛出错误以便上层处理
        }
    }

    const UpdateTask = async(taskId, onTaskUpdated, newContent) => {
        console.log('编辑任务:', taskId, '新内容:', newContent);
        const taskToEdit = selectedTask || null;
        const taskIdToEdit = taskId || (taskToEdit ? taskToEdit.id : null);
        
        if (!taskIdToEdit) {
            console.error('没有选中任务或提供任务ID进行编辑');
            return;
        }
        
        try {
            const previousTaskData = await dispatch(fetchTaskById(taskIdToEdit)).unwrap();
            console.log('获取到的任务数据:', previousTaskData);
            
            // 获取任务名称的Tag ID
            const tagIdName = await dispatch(getTagByName("Name")).unwrap();
            console.log('Name标签ID:', tagIdName);
            
            // 使用传入的新内容，如果没有则使用提示框
            let newTaskName = newContent;
            if (newTaskName === undefined) {
                newTaskName = prompt(t('enterNewTaskName'), previousTaskData?.content || '');
            }
            
            console.log('将要更新的任务名称:', newTaskName);
            
            // 如果用户取消了输入或内容为空，则不执行更新
            if (newTaskName === null || newTaskName === '') {
                console.log('用户取消了编辑或输入内容为空');
                return;
            }
            
            // 准备更新的数据
            const updatedTaskData = {
                [tagIdName]: newTaskName
            };
            
            console.log('准备更新的数据:', updatedTaskData);
            
            // 更新任务
            const result = await dispatch(updateTask({ 
                taskId: taskIdToEdit,
                taskData: {
                    tag_values: updatedTaskData
                },
                oldTask: {
                    previousTaskData
                }
            })).unwrap();
            
            console.log('任务更新结果:', result);
            
            // 如果提供了更新后的回调函数，则调用它
            if (typeof onTaskUpdated === 'function') {
                onTaskUpdated();
            }
        } catch (error) {
            console.error("更新任务时出错:", error);
        } finally {
            // 操作完成后清除选中的任务
            dispatch(setSelectedTask(null));
        }
    }

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
        selectTask,
        UpdateTask,
        CreateTask,
    };
}