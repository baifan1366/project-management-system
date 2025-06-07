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
    if (team && team.access === 'CAN_EDIT') {
      // 1. 加载项目成员
      const projectMembers = await api.projects.getProjectMembers(projectId);

      // 2. 为所有项目成员创建user_team记录，设置角色为CAN_EDIT
      if (projectMembers && projectMembers.length > 0) {
        for (const member of projectMembers) {
          // 确保不重复添加创建者本身
          if (member.user_id !== createdBy) {
            await api.teams.createTeamUser({
              team_id: team.id,
              user_id: member.user_id,
              role: 'CAN_EDIT',
              created_by: createdBy
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('处理团队创建时出错:', error);
  }
};

/**
 * 处理团队访问权限从INVITE_ONLY变更为CAN_EDIT
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleAccessChangeToCanEdit = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'INVITE_ONLY' && team.access === 'CAN_EDIT') {
      // 1. 加载项目成员
      const projectMembers = await api.projects.getProjectMembers(team.project_id);
      
      // 2. 加载当前团队成员
      const teamUsers = await api.teams.getTeamUsers(team.id);
      const teamUserIds = teamUsers.map(tu => tu.user.id);
      
      // 3. 找出不在团队中的项目成员
      const nonTeamMembers = projectMembers.filter(
        member => !teamUserIds.includes(member.user_id)
      );
      
      // 4. 为不在团队中的项目成员创建user_team记录
      for (const member of nonTeamMembers) {
        await api.teams.createTeamUser({
          team_id: team.id,
          user_id: member.user_id,
          role: 'CAN_EDIT',
          created_by: userId
        });
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
export const handleAccessChangeToInviteOnly = async (team, oldValues, userId) => {
  try {
    if (oldValues.access === 'CAN_EDIT' && team.access === 'INVITE_ONLY') {
      // 1. 加载所有user_team记录
      const teamUsers = await api.teams.getTeamUsers(team.id);
      
      // 2. 找出角色为CAN_EDIT的团队成员
      const canEditUsers = teamUsers.filter(tu => tu.role === 'CAN_EDIT');
      
      // 3. 记录这些用户的ID
      const canEditUserIds = canEditUsers.map(tu => tu.user.id);
      
      // 4. 获取团队邀请记录
      const invitations = await api.teams.teamInvitations.getByTeam(team.id);
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
 * 处理团队访问权限更新
 * @param {object} team - 更新后的团队数据
 * @param {object} oldValues - 更新前的团队数据
 * @param {string} userId - 执行更新的用户ID
 */
export const handleTeamAccessUpdate = async (team, oldValues, userId) => {
  if (!team || !oldValues) return;
  
  // 处理从INVITE_ONLY变更为CAN_EDIT
  await handleAccessChangeToCanEdit(team, oldValues, userId);
  
  // 处理从CAN_EDIT变更为INVITE_ONLY
  await handleAccessChangeToInviteOnly(team, oldValues, userId);
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
      
      // 找出所有CAN_EDIT访问权限的团队
      const canEditTeams = projectTeams.filter(team => team.access === 'CAN_EDIT');
      
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
