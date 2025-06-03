'use client';

import { useState, useRef, useEffect } from 'react';
import { Toast } from "@/components/ui/toast";
import { Upload, X, File, Paperclip, FileText, Sheet, Film, Music, Eye, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import useGetUser from '@/lib/hooks/useGetUser';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('FileUploader');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(''); // 添加消息状态
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showDialog, setShowDialog] = useState(false); // 新增状态控制对话框显示
  const { user: currentUser } = useGetUser();

  // 处理文件选择
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // 文件大小检查
    const invalidFiles = selectedFiles.filter(
      file => file.size > maxFileSize * 1024 * 1024
    );
    
    if (invalidFiles.length > 0) {
      setError(t('fileSizeError', { size: maxFileSize }));
      return;
    }
    
    setError('');
    addFiles(selectedFiles);
  };

  // 添加文件到列表
  const addFiles = (selectedFiles) => {
    const newFiles = selectedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  // 移除文件
  const removeFile = (id) => {
    setFiles(files => {
      const updatedFiles = files.filter(file => file.id !== id);
      
      // 清理URL对象
      const fileToRemove = files.find(file => file.id === id);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      return updatedFiles;
    });
  };

  // 处理拖放
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    
    // 文件大小检查
    const invalidFiles = droppedFiles.filter(
      file => file.size > maxFileSize * 1024 * 1024
    );
    
    if (invalidFiles.length > 0) {
      setError(t('fileSizeError', { size: maxFileSize }));
      return;
    }
    
    setError('');
    addFiles(droppedFiles);
  };

  // 触发文件选择
  const triggerFileInput = () => {
    if (buttonOnly) {
      setShowDialog(true); // 在按钮模式下点击时显示对话框
    } else {
      fileInputRef.current?.click();
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件图标
  const getFileIcon = (fileType) => {
    // 根据文件类型返回对应图标
    if (fileType.includes('pdf')) {
      return <File className="w-5 h-5 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('xls')) {
      return <Sheet className="w-5 h-5 text-green-500" />;
    } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z') || fileType.includes('tar') || fileType.includes('gz')) {
      return <File className="w-5 h-5 text-amber-500" />;
    } else if (fileType.includes('video') || fileType.includes('mp4') || fileType.includes('avi') || fileType.includes('mov')) {
      return <Film className="w-5 h-5 text-purple-500" />;
    } else if (fileType.includes('audio') || fileType.includes('mp3') || fileType.includes('wav') || fileType.includes('ogg')) {
      return <Music className="w-5 h-5 text-indigo-500" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // 打开文件预览
  const openPreview = (file) => {
    setPreviewFile(file);
  };

  // 关闭文件预览
  const closePreview = () => {
    setPreviewFile(null);
  };

  // 渲染文件预览内容
  const renderPreviewContent = () => {
    if (!previewFile) return null;

    // 根据文件类型渲染不同的预览组件
    if (previewFile.type.startsWith('image/')) {
      return (
        <img 
          src={previewFile.preview} 
          alt={previewFile.name}
          className="max-w-full max-h-[500px] object-contain mx-auto"
        />
      );
    } else if (previewFile.type.includes('pdf')) {
      return (
        <iframe 
          src={previewFile.preview} 
          className="w-full h-[500px]" 
          title={previewFile.name}
        />
      );
    } else if (previewFile.type.includes('video')) {
      return (
        <video 
          src={previewFile.preview} 
          controls 
          className="max-w-full max-h-[500px] mx-auto"
        />
      );
    } else if (previewFile.type.includes('audio')) {
      return (
        <audio 
          src={previewFile.preview} 
          controls 
          className="w-full mt-8"
        />
      );
    } else if (previewFile.type.includes('text') || 
              previewFile.type.includes('javascript') || 
              previewFile.type.includes('json') || 
              previewFile.type.includes('html') || 
              previewFile.type.includes('css')) {
      // 为文本文件创建预览
      const [textContent, setTextContent] = useState(t('loading'));
      
      // 读取文本内容
      useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target.result);
        };
        reader.onerror = () => {
          setTextContent(t('unableToReadFile'));
        };
        reader.readAsText(previewFile.file);
      }, [previewFile]);
      
      return (
        <div className="w-full h-[500px] overflow-auto bg-gray-50 p-4 rounded border">
          <pre className="whitespace-pre-wrap break-words text-sm">
            {textContent}
          </pre>
        </div>
      );
    } else {
      // 对于其他无法预览的文件类型
      return (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            {getFileIcon(previewFile.type)}
          </div>
          <h3 className="text-xl font-medium mb-2">{previewFile.name}</h3>
          <p className="text-gray-500 mb-4">{formatFileSize(previewFile.size)}</p>
          <p className="text-gray-500">{t('cannotPreview')}</p>
          <button
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => {
              const a = document.createElement('a');
              a.href = previewFile.preview;
              a.download = previewFile.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            {t('downloadFile')}
          </button>
        </div>
      );
    }
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
        throw new Error(t('missingUserOrSession'));
      }

      // 使用外部获取的currentUser
      if (!currentUser) {
        throw new Error(t('userNotLoggedIn'));
      }
      
      if (currentUser.id !== userId) {
        throw new Error(t('noPermission'));
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i].file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `chat-${sessionId}/${fileName}`;
        
        // 上传到Supabase存储
        const { error: uploadError, data } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file, { 
            upsert: true,
            contentType: file.type,
            cacheControl: '3600'
          });
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`${t('uploadFailed')}: ${uploadError.message}`);
        }
        
        // 获取公共URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
          
        // 检查文件是否为图片
        const isImage = file.type.startsWith('image/');
          
        // 存储上传结果
        uploadResults.push({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          preview_url: files[i].preview,
          message_id: messageId, // 可能为null，将在后续处理
          uploaded_by: userId,
          is_image: isImage // 添加标识图片的字段
        });
        
        // 更新进度
        setProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      // 清空文件列表
      setFiles([]);
      
      // 关闭预览（如果有）
      setPreviewFile(null);
      
      // 调用上传完成回调，传入消息内容
      onUploadComplete(uploadResults, message);
      setShowDialog(false); 
      
    } catch (error) {
      console.error('Error during upload:', error);
      setError(error.message || t('uploadFailed'));
    } finally {
      setUploading(false);
      setMessage(''); // 清空消息
    }
  };

  // 清理资源
  const handleClose = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setPreviewFile(null);
    setShowDialog(false); // 关闭对话框
    onClose();
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
          title={t('uploadFile')}
        >
          {children || <Paperclip className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showDialog && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className={`bg-background rounded-lg shadow-lg w-full mx-4 overflow-hidden ${previewFile ? 'max-w-4xl' : 'max-w-md'}`}>
              {previewFile ? (
                <>
                  <div className="flex items-center mb-4 p-4 border-b">
                    <button 
                      onClick={closePreview} 
                      className="p-1 rounded-full hover:bg-accent/50 mr-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-lg font-medium truncate">{previewFile.name}</h2>
                  </div>
                  <div className="preview-container p-4">
                    {renderPreviewContent()}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('uploadFile')}</h2>
                    <button 
                      onClick={handleClose}
                      className="p-1 rounded-full hover:bg-accent/50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-4">
                    {/* 拖放区域 */}
                    <div 
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors",
                        error ? "border-red-500" : isDragging ? "border-primary bg-primary/5" : "border-accent"
                      )}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('dragAndDropFiles', { size: maxFileSize })}
                      </p>
                      {error && (
                        <p className="text-sm text-red-500 mt-2">{error}</p>
                      )}
                    </div>

                    {/* 消息输入框 */}
                    <div className="mt-4">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('addMessage')}
                        className="w-full bg-accent/50 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={2}
                      />
                    </div>

                    {/* 文件列表 */}
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">{t('selectedFiles')}</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                        {files.length > 0 ? (
                          files.map(file => (
                            <div key={file.id} className="flex items-center justify-between bg-accent/50 rounded-lg p-2">
                              <div 
                                className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1"
                                onClick={() => openPreview(file)}
                              >
                                {file.type.startsWith('image/') ? (
                                  <div className="w-10 h-10 rounded overflow-hidden bg-accent flex-shrink-0">
                                    <img 
                                      src={file.preview} 
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    {getFileIcon(file.type)}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <button
                                  onClick={() => openPreview(file)}
                                  className="p-1 rounded-full hover:bg-accent mr-1"
                                  title={t('preview')}
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => removeFile(file.id)}
                                  className="p-1 rounded-full hover:bg-accent"
                                  title={t('deleteFile')}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-3 text-sm text-muted-foreground">
                            {t('noFiles')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 上传进度 */}
                    {uploading && (
                      <div className="mt-4">
                        <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {t('uploading', { progress })}
                        </p>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm rounded-md hover:bg-accent"
                        disabled={uploading}
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={uploadFiles}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                        disabled={files.length === 0 || uploading}
                      >
                        {t('upload')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className={`bg-background rounded-lg shadow-lg w-full mx-4 overflow-hidden ${previewFile ? 'max-w-4xl' : 'max-w-md'}`}>
        {previewFile ? (
          <>
            <div className="flex items-center mb-4 p-4 border-b">
              <button 
                onClick={closePreview} 
                className="p-1 rounded-full hover:bg-accent/50 mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-medium truncate">{previewFile.name}</h2>
            </div>
            <div className="preview-container p-4">
              {renderPreviewContent()}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('uploadFile')}</h2>
              <button 
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-accent/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {/* 拖放区域 */}
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors",
                  error ? "border-red-500" : isDragging ? "border-primary bg-primary/5" : "border-accent"
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                  {t('dragAndDropFiles', { size: maxFileSize })}
                </p>
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
              </div>

              {/* 消息输入框 */}
              <div className="mt-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('addMessage')}
                  className="w-full bg-accent/50 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={2}
                />
              </div>

              {/* 文件列表 */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">{t('selectedFiles')}</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                    {files.map(file => (
                      <div key={file.id} className="flex items-center justify-between bg-accent/50 rounded-lg p-2">
                        <div 
                          className="flex items-center gap-2 overflow-hidden cursor-pointer flex-1"
                          onClick={() => openPreview(file)}
                        >
                          {file.type.startsWith('image/') ? (
                            <div className="w-10 h-10 rounded overflow-hidden bg-accent flex-shrink-0">
                              <img 
                                src={file.preview} 
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {getFileIcon(file.type)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => openPreview(file)}
                            className="p-1 rounded-full hover:bg-accent mr-1"
                            title={t('preview')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => removeFile(file.id)}
                            className="p-1 rounded-full hover:bg-accent"
                            title={t('deleteFile')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 上传进度 */}
              {uploading && (
                <div className="mt-4">
                  <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {t('uploading', { progress })}
                  </p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm rounded-md hover:bg-accent"
                  disabled={uploading}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={uploadFiles}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  disabled={files.length === 0 || uploading}
                >
                  {t('upload')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 