import React, { useState } from 'react';
import { Button, Form, Input, List, Card, Typography, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * 冲刺回顾表单组件
 * 用于添加"进展顺利"和"待改进"内容
 */
const RetrospectiveForm = ({ 
  sprintData, 
  onAddWhatWentWell, 
  onDeleteWhatWentWell, 
  onAddToImprove, 
  onDeleteToImprove,
  loading 
}) => {
  const [whatWentWellForm] = Form.useForm();
  const [toImproveForm] = Form.useForm();
  
  const [addingWhatWentWell, setAddingWhatWentWell] = useState(false);
  const [addingToImprove, setAddingToImprove] = useState(false);

  // 确保 whatWentWell 和 toImprove 是数组
  const whatWentWell = Array.isArray(sprintData?.whatWentWell) 
    ? sprintData.whatWentWell 
    : (sprintData?.whatWentWell ? JSON.parse(sprintData.whatWentWell) : []);
    
  const toImprove = Array.isArray(sprintData?.toImprove)
    ? sprintData.toImprove
    : (sprintData?.toImprove ? JSON.parse(sprintData.toImprove) : []);
  
  // 提交"进展顺利"
  const handleAddWhatWentWell = (values) => {
    onAddWhatWentWell(values.content);
    whatWentWellForm.resetFields();
    setAddingWhatWentWell(false);
  };
  
  // 提交"待改进"
  const handleAddToImprove = (values) => {
    onAddToImprove(values.content);
    toImproveForm.resetFields();
    setAddingToImprove(false);
  };
  
  return (
    <div>
      {/* "进展顺利"部分 */}
      <Card 
        title={<Title level={4}>进展顺利</Title>}
        extra={
          !addingWhatWentWell && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setAddingWhatWentWell(true)}
            >
              添加
            </Button>
          )
        }
      >
        {addingWhatWentWell ? (
          <Form
            form={whatWentWellForm}
            layout="vertical"
            onFinish={handleAddWhatWentWell}
          >
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入内容' }]}
            >
              <TextArea rows={3} placeholder="请输入进展顺利的内容..." />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
                <Button onClick={() => setAddingWhatWentWell(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <List
            dataSource={whatWentWell}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Popconfirm
                    title="确定要删除这项内容吗？"
                    onConfirm={() => onDeleteWhatWentWell(index)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      icon={<DeleteOutlined />} 
                      type="text" 
                      danger
                      loading={loading}
                    />
                  </Popconfirm>
                ]}
              >
                <Text>{item}</Text>
              </List.Item>
            )}
            locale={{ emptyText: '暂无内容，点击"添加"按钮添加' }}
          />
        )}
      </Card>
      
      {/* "待改进"部分 */}
      <Card 
        title={<Title level={4}>待改进</Title>}
        style={{ marginTop: 16 }}
        extra={
          !addingToImprove && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setAddingToImprove(true)}
            >
              添加
            </Button>
          )
        }
      >
        {addingToImprove ? (
          <Form
            form={toImproveForm}
            layout="vertical"
            onFinish={handleAddToImprove}
          >
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入内容' }]}
            >
              <TextArea rows={3} placeholder="请输入需要改进的内容..." />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
                <Button onClick={() => setAddingToImprove(false)}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <List
            dataSource={toImprove}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Popconfirm
                    title="确定要删除这项内容吗？"
                    onConfirm={() => onDeleteToImprove(index)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      icon={<DeleteOutlined />} 
                      type="text" 
                      danger
                      loading={loading}
                    />
                  </Popconfirm>
                ]}
              >
                <Text>{item}</Text>
              </List.Item>
            )}
            locale={{ emptyText: '暂无内容，点击"添加"按钮添加' }}
          />
        )}
      </Card>
    </div>
  );
};

export default RetrospectiveForm; 