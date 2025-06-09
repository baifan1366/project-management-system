'use client';

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDispatch } from "react-redux";
import { fetchTeamUsers } from "@/lib/redux/features/teamUserSlice";
import { fetchUserById } from "@/lib/redux/features/usersSlice";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useTranslations } from 'next-intl';

/**
 * 展示团队成员及其角色
 * @param {Object} props
 * @param {string} props.teamId 团队ID
 */
export default function MembersRole({ teamId }) {
    const dispatch = useDispatch();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const t = useTranslations('TeamOverview');

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                setLoading(true);
                setError(null);
                                
                // 获取团队成员及其角色
                const teamUsers = await dispatch(fetchTeamUsers(teamId)).unwrap();
                
                // 兼容不同返回结构 - 修正数据结构处理
                const teamUsersArr = teamUsers?.users || 
                                    (Array.isArray(teamUsers) ? teamUsers : 
                                    teamUsers?.data || []);
                
                if (teamUsersArr.length === 0) {
                }
                
                // 并行获取每个成员的详细信息
                const users = await Promise.all(
                    teamUsersArr.map(async (tu) => {
                        try {
                            // 根据返回数据结构调整获取用户ID的方式
                            const userId = tu.user_id || tu.user?.id || tu.id;
                            
                            if (!userId) {
                                console.error('无法获取用户ID:', tu);
                                return null;
                            }
                            
                            const user = await dispatch(fetchUserById(userId)).unwrap();
                            return {
                                ...user,
                                role: tu.role,
                            };
                        } catch (userError) {
                            console.error(`获取用户信息失败:`, userError, tu);
                            return {
                                id: tu.user_id || tu.user?.id || tu.id || '未知ID',
                                name: '未知用户',
                                avatar_url: '',
                                role: tu.role || '成员'
                            };
                        }
                    })
                );
                
                // 过滤掉null值
                const validUsers = users.filter(user => user !== null);
                
                setMembers(validUsers);
            } catch (err) {
                console.error("获取团队成员失败:", err);
                console.error("错误详情:", {
                    message: err.message,
                    stack: err.stack,
                    teamId: teamId
                });
                setError("无法加载团队成员");
            } finally {
                setLoading(false);
            }
        };
        
        fetchMembers();
    }, [teamId, dispatch]);

    if (loading) {
        return (
            <div className="flex flex-row gap-4 flex-wrap">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-row items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex flex-col">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-destructive p-2">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
            </div>
        );
    }

    if (members.length === 0) {
        return <p className="text-sm text-muted-foreground p-2">{t('noTeamMemberFound')}</p>;
    }

    return (
        <div className="flex flex-row gap-4 flex-wrap">
            {members.map((user) => (
                <div key={user.id} className="flex flex-row items-center gap-2">
                    <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {user.role === 'OWNER' ? t('OWNER') : 
                             user.role === 'CAN_EDIT' ? t('CAN_EDIT') : 
                             user.role === 'CAN_VIEW' ? t('CAN_VIEW') : 
                             user.role}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}