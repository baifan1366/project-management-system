'use client';

import { updateTeam, fetchTeamById } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { store } from '@/lib/redux/store';

export default function TeamDescription({ teamId }) {
    const dispatch = useDispatch();
    const { user } = useGetUser();

    // 处理富文本HTML内容，确保可以被JSON序列化并保留格式
    const sanitizeHtmlForStorage = (html) => {
        // 如果输入为空，则返回空字符串
        if (!html) return '';
        
        try {
            // 确保html是字符串类型
            const stringHtml = String(html);
            
            // 过滤掉可能导致JSON序列化问题的特殊字符
            // 但保留所有HTML标签和样式属性
            const sanitizedHtml = stringHtml
                .replace(/\u0000/g, '') // 移除空字符
                .trim();
            
            // 返回处理过的HTML字符串，保留所有格式和样式
            return sanitizedHtml;
        } catch (error) {
            console.error('HTML内容清理失败:', error);
            // 出错时返回空字符串，避免API调用失败
            return '';
        }
    };
    
    const updateTeamDescription = async (teamData) => {
        try {
            // 处理描述数据，确保保留富文本格式
            const sanitizedData = {
                ...teamData,
                description: sanitizeHtmlForStorage(teamData.description)
            };
            const userId = user?.id;
            
            // 直接从 Store 获取当前团队数据作为 old_values
            const state = store.getState();
            const oldValues = state.teams.teams.find(team => String(team.id) === String(teamId));
            
            // 更新团队描述到数据库
            dispatch(updateTeam({ 
                teamId, 
                data: sanitizedData,
                user_id: userId,
                old_values: oldValues,
                updated_at: new Date().toISOString()
            }));
            
            // 返回成功状态
            return true;
        } catch (error) {
            console.error('更新团队描述失败:', error);
            return false;
        }
    };
    
    return { updateTeamDescription };
}