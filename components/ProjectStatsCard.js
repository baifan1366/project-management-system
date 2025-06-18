'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent } from '@/components/ui/card';

// 统计卡片组件，专门处理项目成员计数问题
export default function ProjectStatsCard({ icon, title, teams, isTeamMembersCard }) {
  const [value, setValue] = useState("...");
  const teamUsers = useSelector(state => state.teamUsers);
  
  // 使用useEffect来确保每当依赖项变化时重新计算
  useEffect(() => {
    if (!isTeamMembersCard) return; // 不是成员卡片，不需要计算
    
    
    
    // 初始检查
    if (!teams || teams.length === 0) {
      
      setValue("0");
      return;
    }

    
    
    
    // 提取teamUsers对象
    const teamUsersData = teamUsers && teamUsers.teamUsers ? teamUsers.teamUsers : {};
    
    // 计算唯一成员ID
    const uniqueMemberIds = new Set();
    let processedTeamsCount = 0;
    
    for (const team of teams) {
      if (team && team.id) {
        processedTeamsCount++;
        const teamId = team.id;
        const currentTeamUsers = teamUsersData[teamId];
        
        
        
        
        if (Array.isArray(currentTeamUsers)) {
          
          
          // 记录第一个用户的结构
          if (currentTeamUsers.length > 0) {
            
          }
          
          // 计数前后的唯一ID数量，用于调试
          const beforeCount = uniqueMemberIds.size;
          
          currentTeamUsers.forEach(user => {
            if (user && user.user_id) {
              uniqueMemberIds.add(user.user_id);
            }
          });
          
          
        } else {
          
        }
      }
    }
    
    
    
    
    
    // 更新视图
    setValue(uniqueMemberIds.size.toString());
    
  }, [teams, teamUsers, isTeamMembersCard]);
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4 sm:pt-6">
        <div className="flex items-center justify-between">
          <div className="mr-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold">{value}</p>
          </div>
          <div className="p-1.5 sm:p-2 bg-background rounded-full flex-shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
} 