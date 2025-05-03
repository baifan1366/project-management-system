'use client'

import { useState, useEffect, useRef } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  File, FileText, Upload, MoreHorizontal, 
  Download, Trash, Share, Plus, Search, FolderPlus,
  ChevronDown, FileUp, FolderUp,
  Table2, ExternalLink, Sheet, Folder, CheckCircle
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import FileTools from './FileTools'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'


// File item component for drag and drop
const DraggableFileItem = ({ file, index, handleSelectFile, selectedFiles, openFileMenu }) => {
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

  return (
    <Draggable draggableId={file.id.toString()} index={index}>
      {(provided, snapshot) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.5 : 1
          }}
          className={`${file.type === 'folder' ? 'hover:bg-gray-50' : ''} transition-colors duration-200`}
        >
          <TableCell>
            <Checkbox
              checked={selectedFiles.includes(file.id)}
              onCheckedChange={() => handleSelectFile(file.id)}
            />
          </TableCell>
          <TableCell className="font-medium flex items-center h-12 gap-2">
            {getFileIcon(file.type)}
            {file.name}
          </TableCell>
          <TableCell>{file.modified}</TableCell>
          <TableCell>{file.modifiedBy}</TableCell>
          <TableCell>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={(e) => openFileMenu(e, file)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      )}
    </Draggable>
  )
}

export default function TaskFile({ taskId }) {
  const t = useTranslations('CreateTask')
  const { toast } = useToast()
  
  // State for files and UI interactions
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [pathHistory, setPathHistory] = useState([])
  const [showFileTools, setShowFileTools] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [fileContextMenu, setFileContextMenu] = useState(null)
  
  // Fetch files from Supabase
  useEffect(() => {
    if (taskId) {
      fetchFiles()
    } else {
      // Use mock data when no taskId is provided
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
  }, [taskId, currentPath])
  
  // Fetch files function
  const fetchFiles = async () => {
    try {
      setIsLoading(true)
      // Get task data to access attachment IDs
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('attachment_ids')
        .eq('id', taskId)
        .single()
      
      if (taskError) throw taskError
      
      if (taskData && taskData.attachment_ids && taskData.attachment_ids.length > 0) {
        // Get attachments
        const { data: attachments, error: attachmentsError } = await supabase
          .from('attachment')
          .select('id, file_name, file_url, uploaded_by, created_at, task_id, file_path, file_type, size')
          .in('id', taskData.attachment_ids)
        
        if (attachmentsError) throw attachmentsError
        
        // Get user info for uploaded_by fields
        const userIds = [...new Set(attachments.map(file => file.uploaded_by))]
        const { data: users, error: usersError } = await supabase
          .from('user')
          .select('id, name')
          .in('id', userIds)
          
        if (usersError) throw usersError
        
        // Create a user map for quick lookup
        const userMap = {}
        users.forEach(user => {
          userMap[user.id] = user.name
        })
        
        // Filter for current path
        const processedFiles = attachments
          .filter(file => {
            const filePath = file.file_path || '/'
            return filePath === currentPath
          })
          .map(file => ({
            id: file.id,
            name: file.file_name,
            type: getFileTypeFromName(file.file_name),
            file_url: file.file_url,
            path: file.file_path || '/',
            modified: new Date(file.created_at).toISOString().split('T')[0],
            modifiedBy: userMap[file.uploaded_by] || 'Unknown User',
            size: file.size,
            isFolder: file.file_type === 'folder'
          }))
        
        // Add folders
        const { data: folders, error: foldersError } = await supabase
          .from('file_folders')
          .select('*')
          .eq('task_id', taskId)
          .eq('parent_path', currentPath)
        
        if (!foldersError && folders) {
          const folderItems = folders.map(folder => ({
            id: `folder_${folder.id}`,
            name: folder.name,
            type: 'folder',
            path: folder.full_path,
            modified: new Date(folder.created_at).toISOString().split('T')[0],
            modifiedBy: userMap[folder.created_by] || 'Unknown User',
            isFolder: true
          }))
          
          setFiles([...folderItems, ...processedFiles])
        } else {
          setFiles(processedFiles)
        }
      } else {
        // Only fetch folders if no attachments
        const { data: folders, error: foldersError } = await supabase
          .from('file_folders')
          .select('*')
          .eq('task_id', taskId)
          .eq('parent_path', currentPath)
        
        if (!foldersError && folders) {
          const folderItems = folders.map(folder => ({
            id: `folder_${folder.id}`,
            name: folder.name,
            type: 'folder',
            path: folder.full_path,
            modified: new Date(folder.created_at).toISOString().split('T')[0],
            modifiedBy: 'Unknown User', // You might want to fetch this
            isFolder: true
          }))
          
          setFiles(folderItems)
        } else {
          setFiles([])
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      toast({
        title: t('errorFetchingFiles'),
        description: error.message,
        variant: 'destructive'
      })
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
  
  // Handle drag end for drag and drop
  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result
    
    // If dropped outside the list or no move occurred
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return
    }
    
    // If it's a reorder within the same droppable
    if (destination.droppableId === source.droppableId) {
      // Reorder the files array
      const reorderedFiles = Array.from(files)
      const [removed] = reorderedFiles.splice(source.index, 1)
      reorderedFiles.splice(destination.index, 0, removed)
      
      setFiles(reorderedFiles)
      // In a real implementation, you'd update the database here
    } 
    // If dragging to a folder (destination would be a folder's ID)
    else if (destination.droppableId.startsWith('folder_')) {
      const folderId = destination.droppableId
      const fileId = draggableId
      const fileToMove = files.find(f => f.id.toString() === fileId)
      
      if (fileToMove) {
        // Call function to move file to folder
        const targetFolder = files.find(f => f.id.toString() === folderId)
        if (targetFolder && targetFolder.type === 'folder') {
          moveFileToFolder(fileToMove, targetFolder)
        }
      }
    }
  }
  
  // Move file to folder function
  const moveFileToFolder = async (file, targetFolder) => {
    try {
      if (file.type === 'folder') {
        // Update folder path
        const folderId = file.id.toString().replace('folder_', '')
        const { error } = await supabase
          .from('file_folders')
          .update({ 
            parent_path: targetFolder.path,
            full_path: `${targetFolder.path}/${file.name}`
          })
          .eq('id', folderId)
        
        if (error) throw error
      } else {
        // Update file path
        const { error } = await supabase
          .from('attachment')
          .update({ file_path: targetFolder.path })
          .eq('id', file.id)
        
        if (error) throw error
      }
      
      // Update UI
      setFiles(files.filter(f => f.id !== file.id))
      toast({
        title: t('fileMoved'),
        description: t('fileMovedToFolder', { folder: targetFolder.name }),
        variant: 'default'
      })
    } catch (error) {
      console.error('Error moving file:', error)
      toast({
        title: t('errorMovingFile'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }
  
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
        return
      }
      
      // Insert folder record
      const { data, error } = await supabase
        .from('file_folders')
        .insert({
          name: newFolderName,
          task_id: taskId,
          parent_path: currentPath,
          full_path: folderPath,
          created_by: '/* user id from context */' // You should get this from your auth context
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
        modifiedBy: 'Current User', // Replace with actual user name
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
      // For folders, we need to handle recursively
      const foldersToDelete = selectedFiles
        .filter(id => typeof id === 'string' && id.startsWith('folder_'))
        .map(id => parseInt(id.replace('folder_', '')))
      
      // For files, we need to update the task's attachment_ids
      const filesToDelete = selectedFiles.filter(id => typeof id === 'number')
      
      if (foldersToDelete.length > 0) {
        // Delete folders
        const { error: folderError } = await supabase
          .from('file_folders')
          .delete()
          .in('id', foldersToDelete)
        
        if (folderError) throw folderError
      }
      
      if (filesToDelete.length > 0) {
        // Get current task data
        const { data: taskData, error: taskError } = await supabase
          .from('task')
          .select('attachment_ids')
          .eq('id', taskId)
          .single()
        
        if (taskError) throw taskError
        
        // Update attachment_ids array
        const updatedAttachmentIds = taskData.attachment_ids.filter(
          id => !filesToDelete.includes(id)
        )
        
        // Update task
        const { error: updateError } = await supabase
          .from('task')
          .update({ attachment_ids: updatedAttachmentIds })
          .eq('id', taskId)
        
        if (updateError) throw updateError
        
        // Delete from attachments table
        const { error: attachmentError } = await supabase
          .from('attachment')
          .delete()
          .in('id', filesToDelete)
        
        if (attachmentError) throw attachmentError
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
  
  // Filter files based on search term
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
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
              <Button variant="ghost" className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors" asChild>
                <DropdownMenuTrigger className="flex items-center">
                  <Upload className="h-4 w-4 mr-1" />
                  {t('upload')}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </DropdownMenuTrigger>
              </Button>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-800 hover:text-black hover:font-medium transition-colors" 
                  onClick={() => setShowFileTools(true)}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {t('file')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-800 hover:text-black hover:font-medium transition-colors"
                  onClick={() => setShowNewFolderDialog(true)}  
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  {t('newFolder')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="relative w-96">
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
              <Button 
                variant="ghost" 
                className="gap-1 text-destructive hover:text-destructive/80 hover:font-medium transition-colors"
                onClick={handleDeleteSelected}
              >
                <Trash className="h-4 w-4 mr-1" />
                {t('delete')} ({selectedFiles.length})
              </Button>
            )}

            <Button variant="ghost" className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors">
              <Table2 className="h-4 w-4 mr-1" />
              <span className="text-sm">{t('editInGridView')}</span>
            </Button>

            <Button variant="ghost" className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('share')}
            </Button>
          </div>
        </div>
        
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
            <Droppable droppableId="file-list" type="FILE_ITEM">
              {(provided, snapshot) => (
                <TableBody
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={snapshot.isDraggingOver ? 'bg-gray-50' : ''}
                >
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        {t('loading')}
                      </TableCell>
                    </TableRow>
                  ) : filteredFiles.length > 0 ? (
                    <>
                      {filteredFiles.map((file, index) => (
                        <DraggableFileItem
                          key={file.id.toString()}
                          file={file}
                          index={index}
                          handleSelectFile={handleSelectFile}
                          selectedFiles={selectedFiles}
                          openFileMenu={openFileMenu}
                        />
                      ))}
                      {provided.placeholder}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        {t('noFileFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </div>
        
        {/* New Folder Dialog */}
        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('createNewFolder')}</DialogTitle>
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
              >
                {t('cancel')}
              </Button>
              <Button type="button" onClick={createNewFolder}>
                {t('create')}
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
            currentPath={currentPath}
            onFilesUploaded={fetchFiles}
          />
        )}

        {/* Create Droppable areas for each folder */}
        {files
          .filter(file => file.type === 'folder')
          .map(folder => (
            <Droppable 
              key={folder.id.toString()} 
              droppableId={folder.id.toString()} 
              type="FILE_ITEM"
              isDropDisabled={true} // This is for visual purposes only - actual drop handling happens in handleDragEnd
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ display: 'none' }} // Hidden droppable area
                >
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))
        }
      </div>
    </DragDropContext>
  )
}