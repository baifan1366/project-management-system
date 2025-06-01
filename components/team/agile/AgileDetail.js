import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAgileMembers, fetchAgileRoleById } from '@/lib/redux/features/agileSlice';

// 在组件内的相关位置添加以下代码
// 检查agileMembers中的角色ID并获取详细信息
useEffect(() => {
  if (agileMembers.length > 0 && agileRoles.length > 0) {
    // 收集所有角色ID
    const roleIds = [...new Set(agileMembers.map(member => member.role_id).filter(Boolean))];
    
    // 检查哪些角色ID在agileRoles中找不到对应信息
    const missingRoleIds = roleIds.filter(roleId => 
      !agileRoles.some(role => role.id && roleId && role.id.toString() === roleId.toString())
    );
    
    console.log('需要获取详情的角色IDs:', missingRoleIds);
    
    // 为缺失的角色ID获取详细信息
    missingRoleIds.forEach(roleId => {
      if (roleId) {
        dispatch(fetchAgileRoleById(roleId));
      }
    });
  }
}, [agileMembers, agileRoles, dispatch]); 