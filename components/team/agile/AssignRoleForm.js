import React, { useState, useEffect } from 'react';
import { Button, Form, Select, message } from 'antd';
import { api } from '../../../lib/api';

const { Option } = Select;

/**
 * 角色分配表单组件
 * 用于将敏捷角色分配给团队成员
 */
const AssignRoleForm = ({ onSubmit, loading, teamId, agileId }) => {
  const [form] = Form.useForm();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // 加载团队角色
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await api.teams.agile.getAgileRolesByTeamId(teamId);
        if (response?.data) {
          setRoles(response.data);
        }
      } catch (error) {
        console.error('获取敏捷角色失败:', error);
        message.error('获取敏捷角色失败');
      } finally {
        setLoadingRoles(false);
      }
    };
    
    if (teamId) {
      fetchRoles();
    }
  }, [teamId]);
  
  // 加载团队成员
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await api.teams.getTeamUsers(teamId);
        if (response) {
          setUsers(response);
        }
      } catch (error) {
        console.error('获取团队成员失败:', error);
        message.error('获取团队成员失败');
      } finally {
        setLoadingUsers(false);
      }
    };
    
    if (teamId) {
      fetchUsers();
    }
  }, [teamId]);
  
  // 表单提交
  const handleSubmit = (values) => {
    const submitData = {
      ...values,
      agile_id: agileId,
      created_by: values.user_id, // 可以根据需要修改创建者
    };
    
    onSubmit(submitData);
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      {/* 用户选择 */}
      <Form.Item
        name="user_id"
        label="团队成员"
        rules={[{ required: true, message: '请选择团队成员' }]}
      >
        <Select
          placeholder="选择团队成员"
          loading={loadingUsers}
          style={{ width: '100%' }}
        >
          {users.map(user => (
            <Option key={user.user_id} value={user.user_id}>
              {user.user_name || user.user_email || user.user_id}
            </Option>
          ))}
        </Select>
      </Form.Item>
      
      {/* 角色选择 */}
      <Form.Item
        name="role_id"
        label="角色"
        rules={[{ required: true, message: '请选择角色' }]}
      >
        <Select
          placeholder="选择角色"
          loading={loadingRoles}
          style={{ width: '100%' }}
        >
          {roles.map(role => (
            <Option key={role.id} value={role.id}>
              {role.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      
      {/* 提交按钮 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          分配角色
        </Button>
      </Form.Item>
    </Form>
  );
};

export default AssignRoleForm; 