//user click on the thumbs up icon, which consists of active and inactive state
//originally is inactive state with grey color icon
//useGetUser to get the user id
//dispatch the likeTask action from redux
//update the user id into the task table - like column
//the like column is a UUID[] DEFAULT '{}'
//the thumbs up icon become liked with active state and blue color icon
//if user click on the thumbs up icon again, the thumbs up icon become inactive with grey color icon
//remove the user id from the task table - like column
//once user hover the thumbs up icon, the like count and the user who liked the task will be shown
//the content will be like
//Total likes: 10
//user.avatar user.name liked.on

//may use the updateTask action in taskSlice.js
//also use api/teams/section/tasks to update the task table
//use updateDirectly() from api.js

'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThumbsUp } from 'lucide-react';
import { updateTask } from '@/lib/redux/features/taskSlice';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from 'next-intl';
import { createSelector } from '@reduxjs/toolkit';

/**
 * 创建选择器工厂函数
 * 为每个组件实例创建一个独立的选择器，避免跨实例共享状态
 * 优化了记忆化过程，确保转换逻辑在结果函数内部，避免不必要的重新渲染
 * @returns {Function} 返回一个记忆化的选择器函数
 */
const createLikedUsersSelector = () => {
  // 先创建两个基础选择器
  const selectUsers = state => state.users?.users;
  const selectLikes = (_, likes) => likes;
  
  // 创建记忆化选择器，确保转换逻辑在结果函数内部
  return createSelector(
    [selectUsers, selectLikes],
    (users, likes) => {
      // 处理边界情况
      if (!users || !Array.isArray(users) || !likes || !Array.isArray(likes) || !likes.length) {
        return [];
      }
      
      // 对于每个like的id，找到对应的用户并过滤掉未找到的结果
      return likes
        .map(likeId => users.find(user => user.id === likeId))
        .filter(Boolean); // 过滤掉undefined结果
    }
  );
};

/**
 * 任务点赞组件
 * @param {Object} props
 * @param {Object} props.task - 任务对象
 * @param {Function} props.onLikeUpdate - 点赞后的回调函数
 * @returns {JSX.Element}
 */
export default function LikeTask({ task, onLikeUpdate }) {
  const dispatch = useDispatch();
  const { user } = useGetUser();
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState([]);
  const [isHovering, setIsHovering] = useState(false);
  const t = useTranslations('CreateTask');
  const [isLoading, setIsLoading] = useState(false);
  
  // 使用useRef确保我们始终使用相同的选择器实例
  const selectLikedUsersRef = useRef(null);
  if (selectLikedUsersRef.current === null) {
    selectLikedUsersRef.current = createLikedUsersSelector();
  }
  
  // 调用稳定的选择器获取已缓存的用户数据
  const likeUsers = useSelector(state => selectLikedUsersRef.current(state, likes));
  
  // 检查当前用户是否已经点赞
  useEffect(() => {
    if (task && user) {
      // 检查任务是否有likes字段，如果有，则检查用户ID是否在其中
      const taskLikes = task.likes || [];
      setLikes(taskLikes);
      setIsLiked(taskLikes.includes(user.id));
    }
  }, [task, user]);

  // 获取点赞用户数据
  useEffect(() => {
    if (likes && likes.length > 0) {
      // 获取每个点赞用户的信息
      likes.forEach(userId => {
        dispatch(fetchUserById(userId));
      });
    }
  }, [likes, dispatch]);

  // 处理点赞/取消点赞
  const handleLike = async () => {
    if (!user || !task || isLoading) return;

    try {
      setIsLoading(true);
      
      // 创建新的点赞列表
      let newLikes = [...likes];
      
      if (isLiked) {
        // 如果已点赞，则取消点赞
        newLikes = newLikes.filter(id => id !== user.id);
      } else {
        // 如果未点赞，则添加点赞
        newLikes.push(user.id);
      }

      // 更新任务
      await dispatch(updateTask({
        taskId: task.id,
        taskData: { likes: newLikes },
        oldTask: task
      }));

      // 更新本地状态
      setLikes(newLikes);
      setIsLiked(!isLiked);
      
      // 如果有回调函数，则调用
      if (onLikeUpdate) {
        onLikeUpdate(newLikes);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 如果任务或用户为空，不渲染组件
  if (!task || !user) {
    return null;
  }

  // 根据点赞状态返回不同样式的按钮
  return (
    <TooltipProvider>
      <Tooltip open={isHovering && likes.length > 0}>
        <TooltipTrigger asChild>
          <button 
            className={`p-1 rounded-md hover:bg-white hover:dark:bg-black ${isLiked ? 'text-blue-500 visible' : 'text-gray-500 visible'}`}
            onClick={handleLike}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            disabled={isLoading}
          >
            <ThumbsUp size={14} className={`${isLiked ? 'fill-blue-500 text-blue-500' : ''} ${isLoading ? 'opacity-50' : ''}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="p-2 max-w-xs">
          <div className="flex flex-col gap-1">
            <div className="font-semibold">{t('totalLikes')}: {likes.length}</div>
            {likes.length > 0 && (
              <div className="mt-1">
                {/* 显示点赞用户列表 */}
                {likeUsers.map((likeUser, index) => (
                  <div key={likeUser?.id || index} className="flex items-center gap-2 mt-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={likeUser?.avatar_url || "/placeholder-avatar.jpg"} />
                      <AvatarFallback className="text-xs">{likeUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{likeUser?.name || '未知用户'} {t('likedThisTask')}</span>
                  </div>
                ))}
                {likeUsers.length === 0 && likes.length > 0 && (
                  <div className="text-sm text-gray-500">{t('loadingUsers')}</div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}