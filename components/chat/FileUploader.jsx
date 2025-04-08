'use client';

import { useState, useRef } from 'react';
import { Toast } from "@/components/ui/toast";
import { Upload, X, File, Paperclip } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function FileUploader({ 
  onUploadComplete, 
  sessionId, 
  userId,
  messageId = null, // 可选的消息ID，如果已经有消息ID可以直接关联
  maxFileSize = 10, // 最大文件大小，默认10MB
  fileTypes = '*', // 允许的文件类型，默认所有
  showPreview = true, // 是否显示预览
  buttonOnly = false, // 是否只显示按钮
  isOpen = false, // 控制展开收起状态
  onClose = () => {}, // 关闭回调
  isPending = false, // 等待状态
  buttonClassName = "", // 按钮样式类
  children // 子元素，用于自定义按钮内容
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // 文件大小检查
    const invalidFiles = selectedFiles.filter(
      file => file.size > maxFileSize * 1024 * 1024
    );
    
    if (invalidFiles.length > 0) {
      setError(`文件大小不能超过 ${maxFileSize}MB`);
      return;
    }
    
    setError('');
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    
    const uploadResults = [];
    const totalFiles = files.length;
    
    try {
      // 确保用户ID和会话ID存在
      if (!userId || !sessionId) {
        throw new Error('缺少用户ID或会话ID');
      }

      // 获取当前用户身份以确认权限
      const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
      if (authError || !authSession?.user?.id) {
        throw new Error('用户未登录或会话已过期');
      }
      
      if (authSession.user.id !== userId) {
        throw new Error('用户ID不匹配，没有上传权限');
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `chat-${sessionId}/${fileName}`;
        
        // 创建预览URL
        const previewUrl = URL.createObjectURL(file);
        
        // 获取JWT令牌
        const token = authSession.access_token;
        
        // 上传到Supabase存储
        const { error: uploadError, data } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file, { 
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
          });
          
        if (uploadError) {
          console.error('上传错误:', uploadError);
          throw new Error(`上传失败: ${uploadError.message}`);
        }
        
        // 获取公共URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
          
        // 存储上传结果
        uploadResults.push({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          preview_url: previewUrl,
          message_id: messageId, // 可能为null，将在后续处理
          uploaded_by: userId
        });
        
        // 更新进度
        setProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      // 清空文件列表
      setFiles([]);
      
      // 调用上传完成回调
      onUploadComplete(uploadResults);
      
    } catch (error) {
      console.error('上传过程中出错:', error);
      setError(error.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 检测文件是否为图片
  const isImageFile = (file) => {
    return file.type.startsWith('image/');
  };

  if (buttonOnly) {
    return (
      <>
        <input 
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={fileTypes}
          onChange={handleFileSelect}
          disabled={uploading || isPending}
        />
        <button 
          type="button" 
          onClick={triggerFileInput}
          className={cn("p-2 rounded-full hover:bg-accent/50 disabled:opacity-50", buttonClassName)}
          disabled={uploading || isPending}
          title="上传文件"
        >
          {children || <Paperclip className="h-4 w-4 text-muted-foreground" />}
        </button>
        {files.length > 0 && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">上传文件</h2>
                <button 
                  onClick={() => setFiles([])}
                  className="p-1 rounded-full hover:bg-accent/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">已选择的文件</p>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-accent/50 rounded-lg p-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {showPreview && isImageFile(file) ? (
                          <div className="w-10 h-10 rounded overflow-hidden bg-accent flex-shrink-0">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <File className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(index)}
                        className="p-1 rounded-full hover:bg-accent"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      上传中 {progress}%
                    </p>
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setFiles([])}
                    className="px-4 py-2 text-sm rounded-md hover:bg-accent"
                    disabled={uploading}
                  >
                    取消
                  </button>
                  <button
                    onClick={uploadFiles}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    disabled={files.length === 0 || uploading}
                  >
                    上传
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">上传文件</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-accent/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors",
              error ? "border-red-500" : "border-accent"
            )}
            onClick={triggerFileInput}
          >
            <input 
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={fileTypes}
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              点击或拖拽文件至此处上传 (最大 {maxFileSize}MB)
            </p>
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">已选择的文件</p>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-accent/50 rounded-lg p-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {showPreview && isImageFile(file) ? (
                      <div className="w-10 h-10 rounded overflow-hidden bg-accent flex-shrink-0">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(index)}
                    className="p-1 rounded-full hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                上传中 {progress}%
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md hover:bg-accent"
              disabled={uploading}
            >
              取消
            </button>
            <button
              onClick={uploadFiles}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              disabled={files.length === 0 || uploading}
            >
              上传
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 