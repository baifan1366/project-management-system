'use client'

import { useState, useEffect, useRef } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useSelector } from "react-redux"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  File, FileText, Upload, MoreHorizontal, 
  Download, Trash, Share, Plus, Search, FolderPlus,
  ChevronDown, FileUp, FolderUp,
  Table2, ExternalLink, Sheet, Folder, CheckCircle, Eye, ChevronLeft, Send
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import FileTools from './FileTools'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useGetUser } from '@/lib/hooks/useGetUser';
import { api } from '@/lib/api'
import { useParams } from "next/navigation";
import { useConfirm } from '@/hooks/use-confirm'
import ShareFile from './ShareFile'
import GridView from './GridView'
import { createSection } from '@/lib/redux/features/sectionSlice';

// 文件项组件 - 移除DnD包装
const FileItem = ({ file, handleSelectFile, selectedFiles, openFileMenu, navigateToFolder, moveFileToParentFolder, currentPath, openFilePreview, downloadFile, onDragStart, onDragOver, onDragLeave, onDrop, handleDeleteSelected, confirmAndDeleteFiles, confirm, openShareFile }) => {
  const t = useTranslations('File')
  const tConfirm = useTranslations('confirmation')
  // Get file icon based on type
  const getFileIcon = (type) => {
    switch(type) {
      case 'folder':
        return <Folder className="h-4 w-4" />
      case 'excel':
        return <Sheet className="h-4 w-4" />
      case 'word':
        return <FileText className="h-4 w-4" />
      case 'pdf':
        return <File className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  // 处理双击事件
  const handleDoubleClick = () => {
    if (file.type === 'folder') {
      navigateToFolder(file)
    } else {
      openFilePreview(file)
    }
  }

  // 处理拖拽开始
  const handleDragStart = (e) => {
    console.log('Drag started', file.id, file.name);
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: file.id,
      name: file.name,
      type: file.type,
      path: file.path
    }));
    e.currentTarget.classList.add('opacity-50');
    if (onDragStart) onDragStart(file);
  };

  // 处理拖拽结束
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  // 处理拖拽经过
  const handleDragOver = (e) => {
    // 只有文件夹才能接收拖拽
    if (file.type === 'folder') {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.add('border-2', 'border-dashed', 'border-green-500');
      
      // 添加放置指示器
      e.dataTransfer.dropEffect = 'move';
      
      if (onDragOver) onDragOver(file);
    }
  };

  // 处理拖拽离开
  const handleDragLeave = (e) => {
    if (file.type === 'folder') {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.remove('border-2', 'border-dashed', 'border-green-500');
      
      if (onDragLeave) onDragLeave(file);
    }
  };

  // 处理放置
  const handleDrop = (e) => {
    if (file.type === 'folder') {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.remove('border-2', 'border-dashed', 'border-green-500');
      
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        console.log('Drop received', data, 'onto folder', file.name);
        
        if (data && data.id) {
          if (onDrop) onDrop(data, file);
        }
      } catch (error) {
        console.error('Error parsing dragged data:', error);
      }
    }
  };

  return (
    <TableRow
      className={`${file.type === 'folder' ? 'hover:bg-accent dark:hover:bg-accent' : 'hover:bg-accent dark:hover:bg-accent'} transition-colors duration-200`}
      onDoubleClick={handleDoubleClick}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-is-folder={file.type === 'folder' ? 'true' : 'false'}
      data-file-id={file.id}
    >
      <TableCell>
        <Checkbox
          checked={selectedFiles.includes(file.id)}
          onCheckedChange={() => handleSelectFile(file.id)}
        />
      </TableCell>
      <TableCell className="font-medium flex items-center h-12 gap-2 cursor-pointer" onClick={() => file.type !== 'folder' && openFilePreview(file)}>
        {getFileIcon(file.type)}
        <span 
          className={'hover:underline cursor-pointer'}
          onClick={(e) => {
            if (file.type === 'folder') {
              e.stopPropagation();
              navigateToFolder(file);
            }
          }}
        >
          {file.name}
        </span>
        {file.type === 'folder' && (
          <div className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {t('folder')}
          </div>
        )}
      </TableCell>
      <TableCell>{file.modified}</TableCell>
      <TableCell>{file.modifiedBy}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {file.type !== 'folder' && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => openFilePreview(file)}>
                <Eye className="mr-2 h-4 w-4" />
                {t('preview')}
              </DropdownMenuItem>
            )}
            {file.type !== 'folder' && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => downloadFile(file)}>
                <Download className="mr-2 h-4 w-4" />
                {t('download')}
              </DropdownMenuItem>
            )}
            {file.type !== 'folder' && (
            <DropdownMenuItem className="cursor-pointer" onClick={() => openShareFile(file)}>
              <Send className="mr-2 h-4 w-4" />
              {t('share')}
            </DropdownMenuItem>
            )}
            {currentPath !== '/' && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => moveFileToParentFolder(file)}>
                <FolderUp className="mr-2 h-4 w-4" />
                {t('moveToParentFolder')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmAndDeleteFiles(file.id, file.name);
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export default function TaskFile({ taskId, teamId }) {
  const t = useTranslations('File')
  const tConfirm = useTranslations('confirmation')
  const { toast } = useToast()
  const { user } = useGetUser();
  const { confirm } = useConfirm();
  const params = useParams()
  const { id: projectId } = params
  const [themeColor, setThemeColor] = useState('#64748b')
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  // State for files and UI interactions
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [pathHistory, setPathHistory] = useState([])
  const [showFileTools, setShowFileTools] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [fileContextMenu, setFileContextMenu] = useState(null)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [shareFileDialogOpen, setShareFileDialogOpen] = useState(false)
  const [currentFileToShare, setCurrentFileToShare] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' 或 'grid'
  const userId = user?.id
  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  // Fetch files from Supabase
  useEffect(() => {
    if (teamId) {
      fetchFiles()
    } else {
      // Use mock data when no teamId is provided
      setFiles([
        { 
          id: 1, 
          name: 'Class Materials', 
          type: 'folder',
          path: '/Class Materials',
          modified: '2023-10-15',
          modifiedBy: 'Pau Kiu Nai'
        },
        { 
          id: 2, 
          name: 'TIA4213-2510-Group_Selection.xlsx', 
          type: 'excel',
          path: '/',
          modified: new Date().toISOString().split('T')[0],
          modifiedBy: 'YAM CHEE FAI'
        },
        { 
          id: 3, 
          name: 'Project Requirements.docx', 
          type: 'word',
          path: '/',
          modified: new Date().toISOString().split('T')[0],
          modifiedBy: 'Admin User'
        },
        { 
          id: 4, 
          name: 'Meeting Notes.pdf', 
          type: 'pdf',
          path: '/',
          modified: new Date().toISOString().split('T')[0],
          modifiedBy: 'System'
        }
      ])
      setIsLoading(false)
    }
  }, [teamId, currentPath])
  
  // Fetch files function按照SaveFile.js中描述的流程获取文件
  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      
      // 1. 根据teamId获取所有对应的section
      const sections = await api.teams.teamSection.getSectionByTeamId(teamId)
      
      if (!sections || sections.length === 0) {
        setFiles([])
        setIsLoading(false)
        return
      }
      
      // 2. 获取所有section中的taskIds
      const allTaskIds = []
      sections.forEach(section => {
        if (section.task_ids && section.task_ids.length > 0) {
          allTaskIds.push(...section.task_ids)
        }
      })
      
      if (allTaskIds.length === 0) {
        setFiles([])
        setIsLoading(false)
        return
      }
      
      // 3. 获取File标签ID
      let fileTagId
      try {
        const fileTagResponse = await api.tags.getByName('File')
        fileTagId = fileTagResponse.id
      } catch (error) {
        console.error('Error getting File tag:', error)
        // 没有找到File标签，设置空列表并返回
        setFiles([])
        setIsLoading(false)
        return
      }
      
      // 4. 获取所有任务详情 - 批量获取而不是一个一个获取
      let allTasks = []
      try {
        // 尝试使用批量API获取所有任务
        const tasksResponse = await api.teams.teamSectionTasks.listAllTasks()
        if (tasksResponse) {
          // 筛选出当前section中的任务
          allTasks = tasksResponse.filter(task => allTaskIds.includes(task.id))
        }
      } catch (error) {
        console.error('Error fetching all tasks:', error)
        // 如果批量获取失败，则退回到单任务获取，但限制批次数量
        const batchSize = 10 // 每批处理10个任务ID
        for (let i = 0; i < allTaskIds.length; i += batchSize) {
          const batch = allTaskIds.slice(i, i + batchSize)
          await Promise.all(batch.map(async taskId => {
            try {
              const task = await api.teams.teamSectionTasks.getById(taskId)
              if (task) allTasks.push(task)
            } catch (taskError) {
              console.error(`Error fetching task ${taskId}:`, taskError)
            }
          }))
        }
      }
      
      // 5. 筛选出具有File标签的任务
      const fileTasks = allTasks.filter(task => 
        task.tag_values && task.tag_values[fileTagId]
      )
      
      // 6. 收集所有任务ID以查询附件
      const fileTaskIds = fileTasks.map(task => task.id)
      
      if (fileTaskIds.length === 0) {
        setFiles([])
        setIsLoading(false)
        return
      }
      
      // 7. 获取用户信息用于显示
      const userIds = [...new Set(fileTasks.map(task => task.created_by).filter(id => id))]
      let userMap = {}
      
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('user')
          .select('id, name')
          .in('id', userIds)
        
        if (!usersError && users) {
          users.forEach(user => {
            userMap[user.id] = user.name
          })
        }
      }
      
      // 8. 根据任务ID查询附件 - 如果任务ID过多，分批查询
      let attachments = []
      if (fileTaskIds.length > 50) {
        // 分批查询
        const batchSize = 50
        for (let i = 0; i < fileTaskIds.length; i += batchSize) {
          const batchIds = fileTaskIds.slice(i, i + batchSize)
          const { data, error } = await supabase
            .from('attachment')
            .select('id, file_name, file_url, uploaded_by, created_at, task_id, file_path, file_type, size')
            .in('task_id', batchIds)
            .eq('file_path', currentPath)
          
          if (!error && data) {
            attachments = [...attachments, ...data]
          }
        }
      } else {
        // 一次性查询
        const { data, error } = await supabase
          .from('attachment')
          .select('id, file_name, file_url, uploaded_by, created_at, task_id, file_path, file_type, size')
          .in('task_id', fileTaskIds)
          .eq('file_path', currentPath)
        
        if (!error && data) {
          attachments = data
        }
      }
      
      // 9. 获取当前路径下的文件夹 - 同样分批查询
      let folders = []
      if (fileTaskIds.length > 50) {
        const batchSize = 50
        for (let i = 0; i < fileTaskIds.length; i += batchSize) {
          const batchIds = fileTaskIds.slice(i, i + batchSize)
          const { data, error } = await supabase
            .from('file_folders')
            .select('*')
            .in('task_id', batchIds)
            .eq('parent_path', currentPath)
          
          if (!error && data) {
            folders = [...folders, ...data]
          }
        }
      } else {
        const { data, error } = await supabase
          .from('file_folders')
          .select('*')
          .in('task_id', fileTaskIds)
          .eq('parent_path', currentPath)
        
        if (!error && data) {
          folders = data
        }
      }
      
      // 10. 处理数据并设置文件列表
      const processedAttachments = attachments.map(file => ({
        id: file.id,
        name: file.file_name,
        type: getFileTypeFromName(file.file_name),
        file_url: file.file_url,
        path: file.file_path || '/',
        modified: new Date(file.created_at).toISOString().split('T')[0],
        modifiedBy: userMap[file.uploaded_by] || '未知用户',
        size: file.size,
        taskId: file.task_id,
        isFolder: false
      }))
      
      const processedFolders = folders.map(folder => ({
        id: `folder_${folder.id}`,
        name: folder.name,
        type: 'folder',
        path: folder.full_path,
        modified: new Date(folder.created_at).toISOString().split('T')[0],
        modifiedBy: userMap[folder.created_by] || '未知用户',
        taskId: folder.task_id,
        isFolder: true
      }))
      
      setFiles([...processedFolders, ...processedAttachments])
    } catch (error) {
      console.error('Error fetching files:', error)
      toast({
        title: t('errorFetchingFiles'),
        description: error.message,
        variant: 'destructive'
      })
      // 错误情况下设置空列表
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Determine file type from name
  const getFileTypeFromName = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase()
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel'
    if (['doc', 'docx'].includes(ext)) return 'word'
    if (ext === 'pdf') return 'pdf'
    return 'file'
  }
  
  // Handle drag start
  const handleDragStart = (file) => {
    setDraggedItem(file);
    console.log('Drag started for file:', file.name);
  };

  // Handle drag over
  const handleDragOver = (folder) => {
    setDropTarget(folder);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDropTarget(null);
  };

  // Handle drop
  const handleDrop = (droppedFile, targetFolder) => {
    console.log(`Dropping ${droppedFile.name} into ${targetFolder.name}`);
    
    // Avoid dropping onto self
    if (droppedFile.id === targetFolder.id) {
      console.log('Cannot drop onto self');
      return;
    }
    
    // Avoid dropping folder into its subfolder
    if (droppedFile.type === 'folder' && targetFolder.path.startsWith(droppedFile.path)) {
      toast({
        title: '无法移动',
        description: '不能将文件夹移动到其子文件夹中',
        variant: 'destructive'
      });
      return;
    }
    
    // Execute move
    moveFileToFolder(droppedFile, targetFolder);
    
    // Reset drag state
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Move file to folder function - simplified and ensure correct update
  const moveFileToFolder = async (file, targetFolder) => {
    try {
      const targetPath = targetFolder.path;
      console.log(`Moving ${file.name} to folder ${targetFolder.name} (path: ${targetPath})`);

      if (file.type === 'folder') {
        // Get folder ID
        const folderId = file.id.toString().replace('folder_', '');
        
        // Update folder path
        const { error } = await supabase
          .from('file_folders')
          .update({ 
            parent_path: targetPath,
            full_path: `${targetPath}/${file.name}`
          })
          .eq('id', folderId);
        
        if (error) throw error;
        
        // Also update paths for all files inside the folder
        const { error: attachmentError } = await supabase
          .from('attachment')
          .update({ file_path: `${targetPath}/${file.name}` })
          .eq('file_path', file.path);
        
        if (attachmentError) {
          console.warn('Failed to update paths for files inside folder:', attachmentError);
        }
      } else {
        // Update file path
        const { error } = await supabase
          .from('attachment')
          .update({ file_path: targetPath })
          .eq('id', file.id);
        
        if (error) throw error;
      }
      
      toast({
        title: '文件已移动',
        description: `已将${file.name}移动到${targetFolder.name}文件夹`,
        variant: 'default'
      });
      
      // Refresh file list display
      fetchFiles();
    } catch (error) {
      console.error('Error moving file:', error);
      toast({
        title: '移动文件失败',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  
  // Handle folder navigation
  const navigateToFolder = (folder) => {
    setPathHistory([...pathHistory, currentPath])
    setCurrentPath(folder.path)
    setSelectedFiles([])
  }
  
  // Handle back navigation
  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const prevPath = pathHistory[pathHistory.length - 1]
      setPathHistory(pathHistory.slice(0, -1))
      setCurrentPath(prevPath)
      setSelectedFiles([])
    }
  }
  
  // Create new folder
  const createNewFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: t('invalidFolderName'),
        description: t('folderNameCannotBeEmpty'),
        variant: 'destructive'
      })
      return
    }
    
    try {
      setIsCreatingFolder(true)
      const folderPath = currentPath === '/' 
        ? `/${newFolderName}` 
        : `${currentPath}/${newFolderName}`
      
      // Check if folder already exists
      const folderExists = files.some(file => 
        file.type === 'folder' && file.name === newFolderName
      )
      
      if (folderExists) {
        toast({
          title: t('folderAlreadyExists'),
          description: t('pleaseChooseDifferentName'),
          variant: 'destructive'
        })
        setIsCreatingFolder(false)
        return
      }
      
      // 1. Get File tag ID
      const tagName = await api.tags.getByName('Name')
      const nameTagId = tagName.id
      const tagResponse = await api.tags.getByName('File')
      const fileTagId = tagResponse.id
      
      // 2. Check if current team has section, if not create one
      let sectionId
      const sections = await api.teams.teamSection.getSectionByTeamId(teamId)
      
      if (sections && sections.length > 0) {
        // Use first section
        sectionId = sections[0].id
      } else {
        // Create new section
        try {
          const newSection = await dispatch(createSection({
            teamId: teamId,
            sectionData: {
                teamId: teamId,
                sectionName: 'New Section',
                createdBy: userId
            }
          }));
          sectionId = newSection.id
        } catch (error) {
          console.error('创建section失败:', error)
          throw new Error(`创建section失败: ${error.message}`)
        }
      }
      
      // 3. Create new task, include file tag value
      const taskData = {
        created_by: userId,
        tag_values: {
          [nameTagId]: newFolderName,
          [fileTagId]: newFolderName
        }
      }
      
      const taskResponse = await api.teams.teamSectionTasks.create(taskData)
      const newTaskId = taskResponse.id
      
      // 4. Update section's task_ids
      const sectionDetails = await api.teams.teamSection.getSectionById(teamId, sectionId)
      const currentTaskIds = sectionDetails.task_ids || []
      await api.teams.teamSection.updateTaskIds(sectionId, teamId, [...currentTaskIds, newTaskId])
      
      // 5. Create folder record
      const { data, error } = await supabase
        .from('file_folders')
        .insert({
          name: newFolderName,
          task_id: newTaskId,
          parent_path: currentPath,
          full_path: folderPath,
          created_by: userId
        })
        .select()
      
      if (error) throw error
      
      // Add new folder to UI
      const newFolder = {
        id: `folder_${data[0].id}`,
        name: newFolderName,
        type: 'folder',
        path: folderPath,
        modified: new Date().toISOString().split('T')[0],
        modifiedBy: user?.name || 'Current User',
        taskId: newTaskId,
        isFolder: true
      }
      
      setFiles([...files, newFolder])
      setNewFolderName('')
      setShowNewFolderDialog(false)
      
      toast({
        title: t('folderCreated'),
        description: t('folderCreatedSuccessfully'),
        variant: 'default'
      })
    } catch (error) {
      console.error('Error creating folder:', error)
      toast({
        title: t('errorCreatingFolder'),
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsCreatingFolder(false)
    }
  }
  
  // Open file context menu
  const openFileMenu = (e, file) => {
    e.preventDefault()
    setFileContextMenu({
      file,
      x: e.clientX,
      y: e.clientY
    })
  }
  
  // Close file context menu
  const closeFileMenu = () => {
    setFileContextMenu(null)
  }
  
  // Handle file selection
  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId)
      } else {
        return [...prev, fileId]
      }
    })
  }
  
  // Handle select all files
  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id))
    }
  }
  
  // Delete selected files
  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return
    
    try {
      // Separate folder and file IDs
      const foldersToDelete = selectedFiles
        .filter(id => typeof id === 'string' && id.startsWith('folder_'))
        .map(id => parseInt(id.replace('folder_', '')))
      
      const filesToDelete = selectedFiles.filter(id => typeof id === 'number')
      
      // Used to store affected task IDs
      const affectedTaskIds = new Set()
      
      // Handle folder deletion - with recursive deletion of contents
      if (foldersToDelete.length > 0) {
        // 对每个选中的文件夹执行递归删除
        for (const folderId of foldersToDelete) {
          // 获取文件夹详情
          const { data: folderData, error: folderError } = await supabase
            .from('file_folders')
            .select('*')
            .eq('id', folderId)
            .single()
            
          if (folderError) throw folderError
          if (!folderData) continue
          
          // 存储任务ID
          if (folderData.task_id) affectedTaskIds.add(folderData.task_id)
          
          // 递归删除文件夹内容
          await deleteFolderContents(folderData.full_path, affectedTaskIds)
          
          // 删除文件夹本身
          const { error: deleteFolderError } = await supabase
            .from('file_folders')
            .delete()
            .eq('id', folderId)
          
          if (deleteFolderError) throw deleteFolderError
        }
      }
      
      // Handle file deletion
      if (filesToDelete.length > 0) {
        // Get attachment associated tasks
        const { data: attachmentData } = await supabase
          .from('attachment')
          .select('task_id')
          .in('id', filesToDelete)
        
        if (attachmentData) {
          attachmentData.forEach(attachment => {
            if (attachment.task_id) affectedTaskIds.add(attachment.task_id)
          })
        }
        
        // Delete attachments
        const { error: attachmentError } = await supabase
          .from('attachment')
          .delete()
          .in('id', filesToDelete)
        
        if (attachmentError) throw attachmentError
      }
      
      // Update each affected task's attachment_ids
      for (const taskId of affectedTaskIds) {
        // Get remaining attachments for that task
        const { data: remainingAttachments } = await supabase
          .from('attachment')
          .select('id')
          .eq('task_id', taskId)
        
        // Update task's attachment_ids
        await api.teams.teamSectionTasks.updateDirectly(taskId, {
          attachment_ids: remainingAttachments ? remainingAttachments.map(a => a.id) : []
        })
      }
      
      // Update UI
      setFiles(files.filter(file => !selectedFiles.includes(file.id)))
      setSelectedFiles([])
      
      toast({
        title: t('itemsDeleted'),
        description: t('selectedItemsDeleted'),
        variant: 'default'
      })
    } catch (error) {
      console.error('Error deleting items:', error)
      toast({
        title: t('errorDeletingItems'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  // 递归删除文件夹内容的函数
  const deleteFolderContents = async (folderPath, affectedTaskIds) => {
    try {
      // 1. 首先找出该路径下的所有文件
      const { data: filesInFolder, error: filesError } = await supabase
        .from('attachment')
        .select('id, task_id')
        .eq('file_path', folderPath)
      
      if (filesError) throw filesError
      
      // 2. 删除所有文件并收集任务ID
      if (filesInFolder && filesInFolder.length > 0) {
        // 收集任务ID
        filesInFolder.forEach(file => {
          if (file.task_id) affectedTaskIds.add(file.task_id)
        })
        
        // 删除文件
        const { error: deleteFilesError } = await supabase
          .from('attachment')
          .delete()
          .eq('file_path', folderPath)
        
        if (deleteFilesError) throw deleteFilesError
      }
      
      // 3. 查找所有子文件夹
      const { data: subFolders, error: subFoldersError } = await supabase
        .from('file_folders')
        .select('id, full_path, task_id')
        .eq('parent_path', folderPath)
      
      if (subFoldersError) throw subFoldersError
      
      // 4. 递归删除每个子文件夹的内容
      if (subFolders && subFolders.length > 0) {
        // 收集任务ID
        subFolders.forEach(folder => {
          if (folder.task_id) affectedTaskIds.add(folder.task_id)
        })
        
        // 递归删除每个子文件夹内容
        for (const subFolder of subFolders) {
          await deleteFolderContents(subFolder.full_path, affectedTaskIds)
        }
        
        // 删除子文件夹本身
        const subFolderIds = subFolders.map(folder => folder.id)
        const { error: deleteSubFoldersError } = await supabase
          .from('file_folders')
          .delete()
          .in('id', subFolderIds)
        
        if (deleteSubFoldersError) throw deleteSubFoldersError
      }
      
      return true
    } catch (error) {
      console.error('Error deleting folder contents:', error)
      throw error
    }
  }
  
  // 确认并删除文件的函数 - 所有删除操作应该通过此函数
  const confirmAndDeleteFiles = async (fileId = null, fileName = null) => {
    // 如果提供了特定文件ID，先选中该文件
    if (fileId) {
      // 清除之前的选择，只选择当前文件
      setSelectedFiles([fileId]);
    }
    
    // 如果没有选中文件，直接返回
    if (selectedFiles.length === 0 && !fileId) {
      return false;
    }
    
    // 获取要确认的描述文本
    let description;
    let isFolder = false;
    
    // 检查是否为文件夹
    if (fileId && typeof fileId === 'string' && fileId.startsWith('folder_')) {
      isFolder = true;
    } else if (selectedFiles.length === 1 && typeof selectedFiles[0] === 'string' && selectedFiles[0].startsWith('folder_')) {
      isFolder = true;
    }
    
    if (fileName) {
      if (isFolder) {
        description = tConfirm('deleteFileConfirmDesc', { name: fileName }) + ' ' + t('folderAndContentsDeleted');
      } else {
        description = tConfirm('deleteFileConfirmDesc', { name: fileName });
      }
    } else {
      // 检查选中的多个项目中是否有文件夹
      const hasFolder = selectedFiles.some(id => typeof id === 'string' && id.startsWith('folder_'));
      
      if (hasFolder) {
        description = tConfirm('selectedItemsDeleteConfirmDesc', { count: fileId ? 1 : selectedFiles.length }) + ' ' + 
                      t('folderAndContentsDeleted');
      } else {
        description = tConfirm('selectedItemsDeleteConfirmDesc', { count: fileId ? 1 : selectedFiles.length });
      }
    }
    
    // 创建一个Promise来处理确认对话框的结果
    return new Promise((resolve) => {
      // 在用户确认删除时执行
      const onConfirm = async () => {
        // 如果是文件夹删除，显示正在删除内容的提示
        if (isFolder) {
          toast({
            title: t('deletingFolderContents'),
            variant: 'default'
          });
        }
        
        await handleDeleteSelected();
        resolve(true);
      };
      
      // 在用户取消删除时执行
      const onCancel = () => {
        resolve(false);
      };
      
      // 显示确认对话框
      confirm({
        title: tConfirm('deleteConfirm'),
        description: description,
        variant: 'error',
        confirmText: tConfirm('delete'),
        cancelText: tConfirm('cancel'),
        onConfirm,
        onCancel
      });
    });
  }
  
  // Filter files based on search term
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Open file preview
  const openFilePreview = async (file) => {
    // If it's a folder, navigate to that folder
    if (file.type === 'folder') {
      navigateToFolder(file)
      return
    }
    
    try {
      // Get file URL
      let fileUrl = file.file_url
      
      // Open file in new window
      window.open(fileUrl, '_blank')
    } catch (error) {
      console.error('Error opening file preview:', error)
      toast({
        title: t('errorPreviewingFile'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
  // Download file
  const downloadFile = async (file) => {
    try {
      // If file URL exists, use directly
      if (file.file_url) {
        // Set downloading prompt
        toast({
          title: t('downloadStarted'),
          description: t('downloadingFile'),
          variant: 'default'
        })
        
        // Get file content from URL
        const response = await fetch(file.file_url)
        if (!response.ok) {
          throw new Error('Download file failed: ' + response.statusText)
        }
        
        // Get file content as Blob
        const blob = await response.blob()
        
        // Create Blob URL
        const blobUrl = window.URL.createObjectURL(blob)
        
        // Create a temporary link element to download file
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = file.name // Set downloaded file name
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        
        // Clean up
        window.URL.revokeObjectURL(blobUrl)
        document.body.removeChild(a)
        
        toast({
          title: t('downloadCompleted'),
          description: t('fileDownloadedSuccessfully'),
          variant: 'default'
        })
      } else {
        throw new Error('File URL does not exist')
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: t('errorDownloadingFile'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // 将文件移动到上一级目录
  const moveFileToParentFolder = async (file) => {
    try {
      // 获取当前路径的上一级目录
      let parentPath = '/'
      
      if (currentPath !== '/') {
        // 如果当前不是根目录，获取上一级目录
        const pathParts = currentPath.split('/')
        pathParts.pop() // 移除最后一个部分
        parentPath = pathParts.length === 1 ? '/' : pathParts.join('/')
      }
      
      if (file.type === 'folder') {
        // 获取文件夹ID
        const folderId = file.id.toString().replace('folder_', '')
        
        // 更新文件夹路径
        const { error } = await supabase
          .from('file_folders')
          .update({ 
            parent_path: parentPath,
            full_path: `${parentPath}/${file.name}`
          })
          .eq('id', folderId)
        
        if (error) throw error
      } else {
        // 更新文件路径
        const { error } = await supabase
          .from('attachment')
          .update({ file_path: parentPath })
          .eq('id', file.id)
        
        if (error) throw error
      }
      
      // 更新UI
      setFiles(files.filter(f => f.id !== file.id))
      
      toast({
        title: t('fileMoved'),
        description: t('fileMovedToParentFolder'),
        variant: 'default'
      })
      
      // 刷新文件列表
      fetchFiles()
    } catch (error) {
      console.error('Error moving file to parent folder:', error)
      toast({
        title: t('errorMovingFile'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // 打开文件共享对话框
  const openShareFile = (file) => {
    // 确保文件对象包含所需属性
    const fileToShare = {
      ...file,
      file_url: file.file_url || `https://example.com/files/${file.id}`
    };
    setCurrentFileToShare(fileToShare);
    setShareFileDialogOpen(true);
  }

  // 关闭文件共享对话框
  const closeShareFile = (value) => {
    // 处理从对话框返回的值
    if (value === undefined) {
      // 如果没有提供值，则默认为false（关闭对话框）
      setShareFileDialogOpen(false);
    } else {
      // 否则使用传入的值
      setShareFileDialogOpen(value);
    }
    
    // 如果对话框关闭，清除当前共享文件
    if (value !== true) {
      setCurrentFileToShare(null);
    }
  }

  return (
    <div className="w-full px-0 py-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          {currentPath !== '/' && (
            <Button 
              variant="ghost" 
              className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors"
              onClick={navigateBack}
            >
              <ChevronDown className="h-4 w-4 mr-1 rotate-90" />
              {t('back')}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center" asChild>
              <Button
                variant="ghost"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent>
              <DropdownMenuItem 
                className="cursor-pointer" 
                onClick={() => setShowFileTools(true)}
              >
                <FileUp className="mr-2 h-4 w-4" />
                {t('file')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setShowNewFolderDialog(true)}  
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                {t('newFolder')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input
                placeholder={t('searchFile')}
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>          
        </div>
        
        <div className="flex gap-2">
          {selectedFiles.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="gap-1 text-red-500 hover:text-red-600 transition-colors"
                    onClick={async (e) => {
                      e.preventDefault();
                      await confirmAndDeleteFiles();
                    }}
                  >
                    <Trash className="h-4 w-4" />
                    ({selectedFiles.length})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('delete')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {viewMode === 'list' ? t('editInGridView') : t('listView')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    // 检查是否有选中的文件
                    if (selectedFiles.length === 1) {
                      // 找到被选中的文件
                      const selectedFile = files.find(file => file.id === selectedFiles[0]);
                      if (selectedFile) {
                        openShareFile(selectedFile);
                      }
                    } else if (selectedFiles.length > 1) {
                      // 多文件选择的情况
                      toast({
                        title: t('shareError'),
                        description: t('selectOnlyOneFileToShare'),
                        variant: 'destructive'
                      });
                    } else {
                      // 没有选择文件的情况
                      toast({
                        title: t('shareError'),
                        description: t('selectFileToShare'),
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('share')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[3%]"> 
                  <Checkbox
                    checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[45%]">{t('name')}</TableHead>
                <TableHead className="w-[25%]">{t('modifiedDate')}</TableHead>
                <TableHead className="w-[20%]">{t('modifiedBy')}</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              ) : filteredFiles.length > 0 ? (
                <>
                  {filteredFiles.map((file, index) => (
                    <FileItem
                      key={file.id.toString()}
                      file={file}
                      index={index}
                      handleSelectFile={handleSelectFile}
                      selectedFiles={selectedFiles}
                      openFileMenu={openFileMenu}
                      navigateToFolder={navigateToFolder}
                      moveFileToParentFolder={moveFileToParentFolder}
                      currentPath={currentPath}
                      openFilePreview={openFilePreview}
                      downloadFile={downloadFile}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      handleDeleteSelected={handleDeleteSelected}
                      confirmAndDeleteFiles={confirmAndDeleteFiles}
                      confirm={confirm}
                      openShareFile={openShareFile}
                    />
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t('noFileFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <GridView 
          files={filteredFiles}
          isLoading={isLoading}
          selectedFiles={selectedFiles}
          handleSelectFile={handleSelectFile}
          handleSelectAll={handleSelectAll}
          navigateToFolder={navigateToFolder}
          openFilePreview={openFilePreview}
          downloadFile={downloadFile}
          moveFileToParentFolder={moveFileToParentFolder}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          confirmAndDeleteFiles={confirmAndDeleteFiles}
          openShareFile={openShareFile}
          t={t}
        />
      )}
      
      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md"
         onPointerDownOutside={(e) => e.preventDefault()}
         onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('createNewFolder')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              placeholder={t('folderName')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNewFolderDialog(false)}
              disabled={isCreatingFolder}
            >
              {t('cancel')}
            </Button>
            <Button type="button" variant={themeColor} onClick={createNewFolder} disabled={isCreatingFolder}>
              {isCreatingFolder ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* File Upload Dialog */}
      {showFileTools && (
        <FileTools 
          isOpen={showFileTools} 
          onClose={() => setShowFileTools(false)}
          taskId={taskId}
          teamId={teamId}
          currentPath={currentPath}
          onFilesUploaded={fetchFiles}
        />
      )}

      {/* Share File Dialog */}
      {shareFileDialogOpen && (
        <ShareFile 
          open={shareFileDialogOpen}
          onOpenChange={closeShareFile}
          file={currentFileToShare}
        />
      )}
    </div>
  )
}