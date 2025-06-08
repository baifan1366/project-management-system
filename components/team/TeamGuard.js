// A.if there is a team being created, and there is selected "Everyone in project can edit"

// 1.load the project members
// 2.using their userId, create user_team record for all project members, make the role as CAN_EDIT

// B.once there is someone try to update team details, check the team access
// if team access from INVITE_ONLY become CAN_EDIT

// 1.load project members
// 2.find those who are not in the team
// 3.create user_team record for them, make the role as CAN_EDIT

// if team access from CAN_EDIT become INVITE_ONLY
// 1.load all user_team records
// 2.find those who are in the team and have role as CAN_EDIT
// 3.record down their user id
// 4.find the user_team_invitation records 
// 5.for those user id cannot found in user_team_invitation, delete the user_team record

// if team access from INVITE_ONLY become CAN_VIEW
// 1.load project members
// 2.find those who are not in the team
// 3.create user_team record for them, make the role as CAN_VIEW

// if team access from CAN_VIEW become INVITE_ONLY
// 1.load all user_team records
// 2.find those who are in the team and have role as CAN_VIEW
// 3.record down their user id
// 4.find the user_team_invitation records 
// 5.for those user id cannot found in user_team_invitation, delete the user_team record

// if team access from CAN_VIEW become CAN_EDIT
// 1.load all user_team records
// 2.find those who are in the team and have role as CAN_VIEW
// 3.update their role to CAN_EDIT

// if team access from CAN_EDIT become CAN_VIEW
// 1.load all user_team records
// 2.find those who are in the team and have role as CAN_EDIT
// 3.update their role to CAN_VIEW

// C.once there is invited someone to the team, check all project's team access

// 1.if found team that is access with CAN_EDIT
// 2.wait until get the user_team_invitation status is ACCEPTED
// 4.create user_team record for the new member, make the role as CAN_EDIT

import { api } from '@/lib/api';

/**
 * 处理创建CAN_EDIT访问权限的团队
 * @param {object} team - 团队数据
 * @param {string} projectId - 项目ID
 * @param {string} createdBy - 创建者ID
 */
export const handleTeamCreation = async (team, projectId, createdBy) => {
  try {    
    // 检查团队是否为"全项目可编辑"类型
    // 转换为小写进行比较，支持'CAN_EDIT'和'can_edit'两种情况
    if (team && (team.access.toLowerCase() === 'can_edit')) {      
      // 1. 获取项目中的所有团队
      const projectTeams = await api.teams.listByProject(projectId);
      
      if (!projectTeams || projectTeams.length === 0) {
        return;
      }
            
      // 2. 创建一个Map来存储项目中的所有唯一用户
      const projectMembersMap = new Map();
      
      // 3. 获取每个团队的成员并添加到Map中
      for (const existingTeam of projectTeams) {
        // 跳过当前正在创建的团队
        if (String(existingTeam.id) === String(team.id)) continue;
        
        const teamUsers = await api.teams.getTeamUsers(existingTeam.id);
        
        if (teamUsers && teamUsers.length > 0) {
          teamUsers.forEach(member => {
            const userId = member.user.id || member.user_id;
            if (userId && !projectMembersMap.has(userId)) {
              projectMembersMap.set(userId, member.user);
            }
          });
        }
      }
            
      // 4. 为所有项目成员创建user_team记录，设置角色为CAN_EDIT
      for (const [userId, userInfo] of projectMembersMap.entries()) {
        // 确保不重复添加创建者本身
        if (String(userId) !== String(createdBy)) {
          await api.teams.createTeamUser({
            team_id: team.id,
            user_id: userId,
            role: 'CAN_EDIT',
            created_by: createdBy
          });
        }
      }
    } 
  } catch (error) {
    console.error('TeamGuard: 处理团队创建时出错:', error);
    throw error; // 重新抛出错误，让调用方知道发生了错误
  }
};

/**
 * 处理团队访问权限从INVITE_ONLY变更为CAN_EDIT
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeFromInviteOnlyToCanEdit = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'invite_only' && team.access === 'can_edit') {
      // 1. 获取项目中的所有团队
      const projectTeams = await api.teams.listByProject(team.project_id);
      
      if (!projectTeams || projectTeams.length === 0) {
        return;
      }
      
      // 2. 创建一个Map来存储项目中的所有唯一用户
      const projectMembersMap = new Map();
      
      // 3. 获取每个团队的成员并添加到Map中
      for (const existingTeam of projectTeams) {
        // 跳过当前正在更新的团队
        if (String(existingTeam.id) === String(team.id)) {
          continue;
        }
        
        const teamUsers = await api.teams.getTeamUsers(existingTeam.id);
        
        if (teamUsers && teamUsers.length > 0) {
          teamUsers.forEach(member => {
            const userId = member.user.id || member.user_id;
            if (userId && !projectMembersMap.has(userId)) {
              projectMembersMap.set(userId, member.user);
            }
          });
        }
      }
            
      // 4. 获取当前团队成员
      const teamUsers = await api.teams.getTeamUsers(team.id);
      const teamUserIds = teamUsers.map(tu => tu.user.id || tu.user_id);
      
      // 5. 为不在团队中的项目成员创建user_team记录
      let addedCount = 0;
      for (const [memberId, userInfo] of projectMembersMap.entries()) {
        if (!teamUserIds.includes(memberId) && String(memberId) !== String(userId)) {
          try {
            await api.teams.createTeamUser({
              team_id: team.id,
              user_id: memberId,
              role: 'CAN_EDIT',
              created_by: userId
            });
            addedCount++;
          } catch (error) {
            console.error('添加成员到团队失败', { memberId, teamId: team.id, error });
          }
        }
      }
    } 
  } catch (error) {
    console.error('处理访问权限变更为CAN_EDIT时出错:', error);
  }
};

/**
 * 处理团队访问权限从CAN_EDIT变更为INVITE_ONLY
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeFromCanEditToInviteOnly = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'can_edit' && team.access === 'invite_only') {
      
      // 1. 加载所有user_team记录
      const teamUsers = await api.teams.getTeamUsers(team.id);
      
      // 2. 找出角色为CAN_EDIT的团队成员
      const canEditUsers = teamUsers.filter(tu => tu.role === 'CAN_EDIT');
      
      // 3. 记录这些用户的ID
      const canEditUserIds = canEditUsers.map(tu => tu.user.id || tu.user_id);
      
      // 4. 获取团队邀请记录
      const invitations = await api.teams.teamInvitations.list(team.id);
      const invitedUserIds = invitations.map(inv => inv.user_id);
      
      // 5. 找出没有邀请记录的CAN_EDIT用户
      const usersToRemove = canEditUserIds.filter(id => !invitedUserIds.includes(id));
      
      // 6. 删除这些用户的团队成员记录
      for (const userId of usersToRemove) {
        await api.teams.removeTeamUser(team.id, userId, userId);
      }
    }
  } catch (error) {
    console.error('处理访问权限变更为INVITE_ONLY时出错:', error);
  }
};

/**
 * 处理团队访问权限从INVITE_ONLY变更为CAN_VIEW
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeFromInviteOnlyToCanView = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'invite_only' && team.access === 'can_view') {
      // 1. 获取项目中的所有团队
      const projectTeams = await api.teams.listByProject(team.project_id);
      
      if (!projectTeams || projectTeams.length === 0) {
        return;
      }
      
      // 2. 创建一个Map来存储项目中的所有唯一用户
      const projectMembersMap = new Map();
      
      // 3. 获取每个团队的成员并添加到Map中
      for (const existingTeam of projectTeams) {
        // 跳过当前正在更新的团队
        if (String(existingTeam.id) === String(team.id)) {
          continue;
        }
        
        const teamUsers = await api.teams.getTeamUsers(existingTeam.id);
        
        if (teamUsers && teamUsers.length > 0) {
          teamUsers.forEach(member => {
            const userId = member.user.id || member.user_id;
            if (userId && !projectMembersMap.has(userId)) {
              projectMembersMap.set(userId, member.user);
            }
          });
        }
      }
            
      // 4. 获取当前团队成员
      const teamUsers = await api.teams.getTeamUsers(team.id);
      const teamUserIds = teamUsers.map(tu => tu.user.id || tu.user_id);
      
      // 5. 为不在团队中的项目成员创建user_team记录，设置角色为CAN_VIEW
      let addedCount = 0;
      for (const [memberId, userInfo] of projectMembersMap.entries()) {
        if (!teamUserIds.includes(memberId) && String(memberId) !== String(userId)) {
          try {
            await api.teams.createTeamUser({
              team_id: team.id,
              user_id: memberId,
              role: 'CAN_VIEW',
              created_by: userId
            });
            addedCount++;
          } catch (error) {
            console.error('添加成员到团队失败', { memberId, teamId: team.id, error });
          }
        }
      }
    } 
  } catch (error) {
    console.error('处理访问权限变更为CAN_VIEW时出错:', error);
  }
};

/**
 * 处理团队访问权限从CAN_VIEW变更为INVITE_ONLY
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeFromCanViewToInviteOnly = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'can_view' && team.access === 'invite_only') {
      
      // 1. 加载所有user_team记录
      const teamUsers = await api.teams.getTeamUsers(team.id);
      
      // 2. 找出角色为CAN_VIEW的团队成员
      const canViewUsers = teamUsers.filter(tu => tu.role === 'CAN_VIEW');
      
      // 3. 记录这些用户的ID
      const canViewUserIds = canViewUsers.map(tu => tu.user.id || tu.user_id);
      
      // 4. 获取团队邀请记录
      const invitations = await api.teams.teamInvitations.list(team.id);
      const invitedUserIds = invitations.map(inv => inv.user_id);
      
      // 5. 找出没有邀请记录的CAN_VIEW用户
      const usersToRemove = canViewUserIds.filter(id => !invitedUserIds.includes(id));
      
      // 6. 删除这些用户的团队成员记录
      for (const userId of usersToRemove) {
        await api.teams.removeTeamUser(team.id, userId, userId);
      }
    }
  } catch (error) {
    console.error('处理访问权限从CAN_VIEW变更为INVITE_ONLY时出错:', error);
  }
};

/**
 * 处理团队访问权限从CAN_VIEW变更为CAN_EDIT
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeFromCanViewToCanEdit = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'can_view' && team.access === 'can_edit') {
      
      // 1. 加载所有user_team记录
      const teamUsers = await api.teams.getTeamUsers(team.id);
      
      // 2. 找出角色为CAN_VIEW的团队成员
      const canViewUsers = teamUsers.filter(tu => tu.role === 'CAN_VIEW');
      
      // 3. 更新这些用户的角色为CAN_EDIT
      for (const user of canViewUsers) {
        const userId = user.user.id || user.user_id;
        await api.teams.updateTeamUser(team.id, userId, 'CAN_EDIT', userId);
      }
    }
  } catch (error) {
    console.error('处理访问权限从CAN_VIEW变更为CAN_EDIT时出错:', error);
  }
};

/**
 * 处理团队访问权限从CAN_EDIT变更为CAN_VIEW
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeFromCanEditToCanView = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'can_edit' && team.access === 'can_view') {
      
      // 1. 加载所有user_team记录
      const teamUsers = await api.teams.getTeamUsers(team.id);
      
      // 2. 找出角色为CAN_EDIT的团队成员
      const canEditUsers = teamUsers.filter(tu => tu.role === 'CAN_EDIT');
      
      // 3. 更新这些用户的角色为CAN_VIEW
      for (const user of canEditUsers) {
        const userId = user.user.id || user.user_id;
        await api.teams.updateTeamUserRole(team.id, userId, 'CAN_VIEW');
      }
    }
  } catch (error) {
    console.error('处理访问权限从CAN_EDIT变更为CAN_VIEW时出错:', error);
  }
};

/**
 * 处理团队访问权限更新
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleTeamAccessUpdate = async (team, oldValues, userId) => {
  if (!team || !oldValues) return;
  
  // 处理从INVITE_ONLY变更为CAN_EDIT
  await handleAccessChangeFromInviteOnlyToCanEdit(team, oldValues, userId);
  
  // 处理从CAN_EDIT变更为INVITE_ONLY
  await handleAccessChangeFromCanEditToInviteOnly(team, oldValues, userId);
  
  // 处理从INVITE_ONLY变更为CAN_VIEW
  await handleAccessChangeFromInviteOnlyToCanView(team, oldValues, userId);
  
  // 处理从CAN_VIEW变更为INVITE_ONLY
  await handleAccessChangeFromCanViewToInviteOnly(team, oldValues, userId);
  
  // 处理从CAN_VIEW变更为CAN_EDIT
  await handleAccessChangeFromCanViewToCanEdit(team, oldValues, userId);
  
  // 处理从CAN_EDIT变更为CAN_VIEW
  await handleAccessChangeFromCanEditToCanView(team, oldValues, userId);
};

/**
 * 处理团队邀请接受事件
 * @param {object} invitation - 邀请数据
 * @param {string} userId - 用户ID
 */
export const handleInvitationAccepted = async (invitation, userId) => {
  try {
    if (invitation && invitation.status === 'ACCEPTED') {
      // 获取项目的所有团队
      const projectTeams = await api.teams.listByProject(invitation.project_id);
      
      // 找出所有CAN_EDIT和CAN_VIEW访问权限的团队
      const canEditTeams = projectTeams.filter(team => team.access === 'can_edit');
      const canViewTeams = projectTeams.filter(team => team.access === 'can_view');
      
      // 为所有CAN_EDIT团队创建团队成员记录
      for (const team of canEditTeams) {
        // 检查用户是否已经是团队成员
        const teamUsers = await api.teams.getTeamUsers(team.id);
        const isAlreadyMember = teamUsers.some(tu => String(tu.user.id) === String(userId));
        
        // 如果不是团队成员，则添加
        if (!isAlreadyMember) {
          await api.teams.createTeamUser({
            team_id: team.id,
            user_id: userId,
            role: 'CAN_EDIT',
            created_by: invitation.created_by
          });
        }
      }
      
      // 为所有CAN_VIEW团队创建团队成员记录
      for (const team of canViewTeams) {
        // 检查用户是否已经是团队成员
        const teamUsers = await api.teams.getTeamUsers(team.id);
        const isAlreadyMember = teamUsers.some(tu => String(tu.user.id) === String(userId));
        
        // 如果不是团队成员，则添加
        if (!isAlreadyMember) {
          await api.teams.createTeamUser({
            team_id: team.id,
            user_id: userId,
            role: 'CAN_VIEW',
            created_by: invitation.created_by
          });
        }
      }
    }
  } catch (error) {
    console.error('处理邀请接受时出错:', error);
  }
};

// 导出所有处理函数
export const TeamGuard = {
  handleTeamCreation,
  handleTeamAccessUpdate,
  handleInvitationAccepted
};

export default TeamGuard;
