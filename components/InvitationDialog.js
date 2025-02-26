'use client'

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link2, Copy, UserPlus, Eye, ChevronDown, Mail, Pen, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InvitationDialog({ open, onClose }) {
  const t = useTranslations('Invitation')
  const params = useParams()
  const { id: projectId, teamId } = params
  const [mounted, setMounted] = useState(false)
  const [themeColor, setThemeColor] = useState('#64748b')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('editor')
  const [linkEnabled, setLinkEnabled] = useState(true)
  const [isLinkLoading, setIsLinkLoading] = useState(false)
  // 直接从 Redux store 获取数据，而不是重新请求
  const team = useSelector(state => 
    state.teams.teams.find(t => String(t.id) === String(teamId))
  );
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  // const user = useSelector(state => state.auth.user);

  const buttonVariants = [
    { value: 'black', label: '黑色' },
    { value: 'red', label: '红色' },
    { value: 'orange', label: '橙色' },
    { value: 'green', label: '绿色' },
    { value: 'blue', label: '蓝色' },
    { value: 'purple', label: '紫色' },
    { value: 'pink', label: '粉色' }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (project?.theme_color) {
      const matchingVariant = buttonVariants.find(variant => variant.value === project.theme_color);
      setThemeColor(matchingVariant ? matchingVariant.value : '#64748b');
    }
  }, [project]);

  const handleCopyLink = async () => {
    const inviteLink = `${window.location.origin}/invite/${teamId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      // You can add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      // Add your email invitation logic here
      console.log('Sending invite to:', email, 'with permission:', permission);
      setEmail('');
      setShowEmailForm(false);
    } catch (error) {
      console.error('Failed to send invite:', error);
    }
  };

  if (!mounted) {
    return <div className="h-screen" suppressHydrationWarning />;
  }

  if (!team || !project) {
    return null;
  }
  
  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if(!isOpen) {
          onClose()
        }
      }}
      modal={true}
    >
      <DialogContent 
        className="max-w-md rounded-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">
            {t('inviteToTeam')} {team.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            {t('invitationDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Share buttons */}
          <div className="flex space-x-5">
            <button 
              className={`flex items-center transition-colors ${!showEmailForm ? 'text-blue-500' : 'text-foreground hover:text-accent-foreground'}`}
              onClick={() => setShowEmailForm(false)}
            > 
              <Link2 className={`w-4 h-4 mr-2 ${!showEmailForm ? 'text-blue-500' : ''}`} />
              <span className="text-sm">{t('shareLink')}</span>
            </button>
            
            <button 
              className={`flex items-center transition-colors ${showEmailForm ? 'text-blue-500' : 'text-foreground hover:text-accent-foreground'}`}
              onClick={() => setShowEmailForm(true)}
            > 
              <Mail className={`w-4 h-4 mr-2 ${showEmailForm ? 'text-blue-500' : ''}`} />
              <span className="text-sm">{t('email')}</span>
            </button>
          </div>
          {showEmailForm ? (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="h-[1px] w-full bg-border" />
              <div className="flex items-center justify-between p-3 h-[40px] border rounded-lg">
                <div className="flex items-center flex-1">
                  <Input
                    type="email"
                    placeholder={t('enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger className="border-0 focus:ring-0 focus:ring-offset-0 w-[110px]">
                    <SelectValue placeholder={t('selectPermission')}>
                      {permission && (
                        <div className="flex items-center mr-2">
                          {permission === 'editor' && <Pen className="w-4 h-4 mr-2 text-gray-500" />}
                          {permission === 'checker' && <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />}
                          {permission === 'viewer' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                          <span>{t(permission)}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">
                      <div className="flex items-center w-full">
                        <Pen className="w-5 h-5 mr-3 text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium">{t('editor')}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t('editorDescription')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="checker">
                      <div className="flex items-center w-full">
                        <CheckCircle className="w-5 h-5 mr-3 text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium">{t('checker')}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t('checkerDescription')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center w-full">
                        <Eye className="w-5 h-5 mr-3 text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium">{t('viewer')}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t('viewerDescription')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                variant={themeColor}
                disabled={!email}
              >
                {t('sendInvite')}
              </Button>
            </form>
          ) : (
            <div className="rounded-lg space-y-5">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between p-3 h-[40px]">
                  <div className="flex items-center space-x-2">
                    <Link2 className="w-4 h-4" />
                    <span>{t('shareLink')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={linkEnabled}
                      onCheckedChange={async (checked) => {
                        setIsLinkLoading(true);
                        try {
                          // Simulate API call with a small delay
                          await new Promise(resolve => setTimeout(resolve, 500));
                          setLinkEnabled(checked);
                        } finally {
                          setIsLinkLoading(false);
                        }
                      }}
                      disabled={isLinkLoading}
                    />
                  </div>
                </div>
                  {linkEnabled && (
                    <>
                      <div className="h-[1px] w-full bg-border" />
                      <div className="flex items-center justify-between p-3 h-[40px]">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4" />
                          <span>{t('permissions')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select value={permission} onValueChange={setPermission}>
                            <SelectTrigger className="border-0 focus:ring-0 focus:ring-offset-0">
                              <SelectValue placeholder={t('selectPermission')}>
                                {permission ? (
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center mr-2">
                                      {permission === 'editor' && <Pen className="w-4 h-4 mr-2 text-gray-500" />}
                                      {permission === 'checker' && <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />}
                                      {permission === 'viewer' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                                      <span>{t(permission)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  ''
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor" className="relative flex items-center py-3 px-3 hover:bg-accent">
                                <div className="flex items-center w-full">
                                  <Pen className="w-5 h-5 mr-3 text-gray-500" />
                                  <div className="flex-1">
                                    <div className="font-medium">{t('editor')}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {t('editorDescription')}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="checker" className="relative flex items-center py-3 px-3 hover:bg-accent">
                                <div className="flex items-center w-full">
                                  <CheckCircle className="w-5 h-5 mr-3 text-gray-500" />
                                  <div className="flex-1">
                                    <div className="font-medium">{t('checker')}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {t('checkerDescription')}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="viewer" className="relative flex items-center py-3 px-3 hover:bg-accent">
                                <div className="flex items-center w-full">
                                  <Eye className="w-5 h-5 mr-3 text-gray-500" />
                                  <div className="flex-1">
                                    <div className="font-medium">{t('viewer')}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {t('viewerDescription')}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {linkEnabled && (
                  <Button 
                    className="w-full"
                    variant={themeColor}
                    onClick={handleCopyLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('copyLink')}
                  </Button>
                )}
              </div>
          )}

          {/* Member list */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500">{t('teamMembers')}</h3>
            {/* {user && ( */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    {/* <AvatarImage src={user.avatar_url || "/placeholder-avatar.jpg"} /> */}
                    <AvatarFallback>user.name?.charAt(0)</AvatarFallback>
                  </Avatar>
                  <div>
                    <span>user.name</span>
                    <span className="text-gray-500 ml-2">user.email</span>
                  </div>
                </div>
                <span className="text-gray-500">{t('owner')}</span>
              </div>
            {/* )} */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}