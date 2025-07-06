const fs = require('fs');
const path = require('path');

// Dictionary for Chinese translations
const zhTranslations = {
  // Common terms
  "clear": "清除",
  "Clear": "清除",
  "Priority": "优先级",
  "Low": "低",
  "Medium": "中",
  "High": "高",
  "Urgent": "紧急",
  "priority_low": "低",
  "priority_medium": "中",
  "priority_high": "高",
  "priority_urgent": "紧急",
  "Success": "成功",
  "Error": "错误",
  "Retry": "重试",
  "Name is required": "名称是必填的",
  "Name must be less than 50 characters": "名称不能超过50个字符",
  
  // Notifications
  "Enable All Notifications": "启用所有通知",
  "Enable or disable all notifications at once": "一次性启用或禁用所有通知",
  "Notification Channels": "通知渠道",
  "Chat Notifications": "聊天通知",
  "Receive notifications when you are added to a chat": "当您被添加到聊天时接收通知",
  "Meeting Invitations": "会议邀请",
  "Get notified when you're invited to meetings": "当您被邀请参加会议时收到通知",
  "Team Announcements": "团队公告",
  "Get notified about team announcements and updates": "获取有关团队公告和更新的通知",
  "Email Authentication": "电子邮件验证",
  "Receive verification codes via email": "通过电子邮件接收验证码",
  "Disable": "禁用",
  "Select Language": "选择语言",
  "Select Timezone": "选择时区",
  "Select Time Format": "选择时间格式",
  "New password cannot be the same as the current password": "新密码不能与当前密码相同",
  
  // Subscription
  "Project Creation Limit Reached": "已达到项目创建限制",
  "Member Invitation Limit Reached": "已达到成员邀请限制",
  "Team Creation Limit Reached": "已达到团队创建限制",
  "AI Chat Limit Reached": "已达到AI聊天限制",
  "Operation Limited": "操作受限",
  "Subscription Limit": "订阅限制",
  "Current Usage: {current}/{limit}": "当前使用量: {current}/{limit}",
  "Upgrade Subscription": "升级订阅",
  
  // Usage stats
  "Refreshing usage statistics...": "刷新使用统计...",
  "Statistics refreshed successfully!": "统计数据刷新成功！",
  "Loading usage statistics...": "加载使用统计...",
  "Try Again": "重试",
  "Failed to fetch usage statistics": "获取使用统计失败",
  "Team Members": "团队成员",
  "AI Chat Credits": "AI聊天额度",
  "AI Task Credits": "AI任务额度",
  "AI Workflow Credits": "AI工作流额度",
  
  // Payment
  "Loading payment history...": "加载支付历史...",
  "Payment history loaded": "支付历史已加载",
  "Failed to load payment history": "加载支付历史失败",
  "Preparing invoice...": "准备发票...",
  "Invoice ready for download": "发票准备下载",
  "Popup blocked, please allow popups to view the invoice": "弹窗被阻止，请允许弹窗以查看发票",
  "Failed to load invoice": "加载发票失败",
  
  // Upgrade
  "Upgrade to a paid plan to unlock all features and continue using your subscription without interruption.": "升级到付费计划以解锁所有功能并继续使用您的订阅而不中断。",
  "Loading plans...": "加载计划...",
  "Failed to load plans": "加载计划失败",
  "Processing upgrade request...": "处理升级请求...",
  "Redirecting to checkout": "重定向到结账",
  "You will be redirected to complete your upgrade.": "您将被重定向以完成升级。",
  "Failed to start upgrade process": "启动升级过程失败",
  
  // Auth
  "Authentication required": "需要认证",
  "Please login to upgrade your plan": "请登录以升级您的计划",
  "Team Creation Limited": "团队创建受限",
  
  // Projects
  "Clear Search": "清除搜索",
  "No teams found": "未找到团队",
  "{count} teams found": "找到 {count} 个团队",
  "Created On": "创建于",
  "Owner": "拥有者",
  "You": "您",
  "Member": "成员",
  "Checker": "检查者",
  "Viewer": "查看者",
  "Quick Chat": "快速聊天",
  "Team Members": "团队成员",
  "No team members found": "未找到团队成员",
  
  // Activity log
  "Recent Activity": "最近活动",
  "No recent activity": "没有最近活动",
  "Project ": "项目 ",
  " has been created.": " 已创建。",
  " has been updated.": " 已更新。",
  "Team ": "团队 ",
  " details has been updated.": " 详情已更新。",
  "Team invitation sent to ": "团队邀请已发送给 ",
  "Team invitation for ": "团队邀请给 ",
  
  // Project details
  "Project Details": "项目详情",
  "Starred Teams": "星标团队",
  "Total Tasks": "总任务数",
  "Project Teams": "项目团队",
  "All Teams": "所有团队",
  "Pending": "待处理",
  "On Hold": "暂停",
  "Cancelled": "已取消",
  "No teams available": "没有可用团队",
  "No description provided": "未提供描述",
  "Created": "已创建",
  
  // My tasks
  "Ref": "参考",
  "Task not found": "未找到任务",
  "Loading assigned users...": "加载已分配用户...",
  "No description": "无描述",
  "All": "全部",
  "Me": "我",
  "Task has been created successfully": "任务已成功创建",
  "Cannot select past date": "不能选择过去的日期",
  "Team": "团队",
  "Section": "章节",
  "Unknown Project": "未知项目",
  "Unknown Team": "未知团队",
  "Unknown Section": "未知章节",
  "Assignees": "受理人",
  "Loading task details...": "加载任务详情...",
  "View in Original Project": "在原始项目中查看",
  "Task details not found": "未找到任务详情",
  "Cannot delete a task that is referenced from a team project": "无法删除团队项目引用的任务",
  "You don't have permission to edit this team task": "您无权编辑此团队任务",
  "You are no longer a member of the team this task belongs to": "您不再是此任务所属团队的成员",
  "Cannot delete a past due task": "无法删除已逾期的任务",
  "Cannot edit a past due task": "无法编辑已逾期的任务",
  "Tasks that are past their due date are locked for historical record keeping": "已过期的任务被锁定用于历史记录保存",
  "Past due": "已逾期",
  
  // Notifications
  "Task deleted": "任务已删除",
  "Task unassigned": "任务已取消分配",
  "Added to chat": "已添加到聊天",
  "Meeting invitation": "会议邀请",
  "Team invitation": "团队邀请",
  "Team announcement": "团队公告",
  
  // Errors
  "Character limit exceeded (1000 max)": "字符限制超出（最多1000）",
  
  // Create task
  "Failed to load users": "加载用户失败",
  "Project Archived": "项目已存档",
  "Project Not Public": "项目不公开",
  "OK": "确定",
  "This project is not public. You can no longer create tasks in it.": "此项目不公开。您不能再创建任务。",
  "This project has been archived. You can no longer create tasks in it.": "此项目已存档。您不能再创建任务。",
  "Task deleted successfully": "任务已成功删除",
  "Failed to delete task": "删除任务失败",
  "Add Status": "添加状态",
  "Upgrade plan required": "需要升级计划",
  "Multiple users ({count})": "多个用户 ({count})",
  "No users": "没有用户",
  "Section Name required.": "章节名称必填。",
  "Task Name must contain at least 2 characters and not more than 50 characters.": "任务名称必须至少包含2个字符，不超过50个字符。",
  "will be deleted.": "将被删除。",
  "Confirm Delete Task": "确认删除任务",
  "Are you sure you want to delete this task? This action cannot be undone.": "您确定要删除此任务吗？此操作无法撤消。",
  "Your project has been created successfully.": "您的项目已成功创建。",
  "Clear Selection": "清除选择",
  "Workflow Tasks": "工作流任务",
  "Manage Status Options": "管理状态选项",
  "Hide Status Manager": "隐藏状态管理器"
};

// Dictionary for Malay translations
const myTranslations = {
  // Common terms
  "clear": "Kosongkan",
  "Clear": "Kosongkan",
  "Priority": "Keutamaan",
  "Low": "Rendah",
  "Medium": "Sederhana",
  "High": "Tinggi",
  "Urgent": "Segera",
  "priority_low": "Rendah",
  "priority_medium": "Sederhana",
  "priority_high": "Tinggi",
  "priority_urgent": "Segera",
  "Success": "Berjaya",
  "Error": "Ralat",
  "Retry": "Cuba lagi",
  "Name is required": "Nama diperlukan",
  "Name must be less than 50 characters": "Nama mestilah kurang daripada 50 aksara",
  
  // Notifications
  "Enable All Notifications": "Aktifkan Semua Pemberitahuan",
  "Enable or disable all notifications at once": "Aktifkan atau nyahaktifkan semua pemberitahuan sekaligus",
  "Notification Channels": "Saluran Pemberitahuan",
  "Chat Notifications": "Pemberitahuan Perbualan",
  "Receive notifications when you are added to a chat": "Terima pemberitahuan apabila anda ditambahkan ke perbualan",
  "Meeting Invitations": "Jemputan Mesyuarat",
  "Get notified when you're invited to meetings": "Dapatkan pemberitahuan apabila anda dijemput ke mesyuarat",
  "Team Announcements": "Pengumuman Pasukan",
  "Get notified about team announcements and updates": "Dapatkan pemberitahuan mengenai pengumuman dan kemas kini pasukan",
  "Email Authentication": "Pengesahan E-mel",
  "Receive verification codes via email": "Terima kod pengesahan melalui e-mel",
  "Disable": "Nyahaktifkan",
  "Select Language": "Pilih Bahasa",
  "Select Timezone": "Pilih Zon Waktu",
  "Select Time Format": "Pilih Format Masa",
  "New password cannot be the same as the current password": "Kata laluan baharu tidak boleh sama dengan kata laluan semasa",
  
  // Subscription
  "Project Creation Limit Reached": "Had Penciptaan Projek Dicapai",
  "Member Invitation Limit Reached": "Had Jemputan Ahli Dicapai",
  "Team Creation Limit Reached": "Had Penciptaan Pasukan Dicapai",
  "AI Chat Limit Reached": "Had Perbualan AI Dicapai",
  "Operation Limited": "Operasi Terhad",
  "Subscription Limit": "Had Langganan",
  "Current Usage: {current}/{limit}": "Penggunaan Semasa: {current}/{limit}",
  "Upgrade Subscription": "Naik Taraf Langganan",
  
  // Usage stats
  "Refreshing usage statistics...": "Menyegarkan statistik penggunaan...",
  "Statistics refreshed successfully!": "Statistik disegarkan dengan berjaya!",
  "Loading usage statistics...": "Memuatkan statistik penggunaan...",
  "Try Again": "Cuba lagi",
  "Failed to fetch usage statistics": "Gagal mendapatkan statistik penggunaan",
  "Team Members": "Ahli Pasukan",
  "AI Chat Credits": "Kredit Perbualan AI",
  "AI Task Credits": "Kredit Tugas AI",
  "AI Workflow Credits": "Kredit Aliran Kerja AI",
  
  // Payment
  "Loading payment history...": "Memuatkan sejarah pembayaran...",
  "Payment history loaded": "Sejarah pembayaran dimuat",
  "Failed to load payment history": "Gagal memuatkan sejarah pembayaran",
  "Preparing invoice...": "Menyediakan invois...",
  "Invoice ready for download": "Invois sedia untuk dimuat turun",
  "Popup blocked, please allow popups to view the invoice": "Pop timbul disekat, sila benarkan pop timbul untuk melihat invois",
  "Failed to load invoice": "Gagal memuatkan invois",
  
  // Upgrade
  "Upgrade to a paid plan to unlock all features and continue using your subscription without interruption.": "Naik taraf ke pelan berbayar untuk membuka semua ciri dan terus menggunakan langganan anda tanpa gangguan.",
  "Loading plans...": "Memuatkan pelan...",
  "Failed to load plans": "Gagal memuatkan pelan",
  "Processing upgrade request...": "Memproses permintaan naik taraf...",
  "Redirecting to checkout": "Mengarahkan ke pembayaran",
  "You will be redirected to complete your upgrade.": "Anda akan diarahkan untuk melengkapkan naik taraf anda.",
  "Failed to start upgrade process": "Gagal memulakan proses naik taraf",
  
  // Auth
  "Authentication required": "Pengesahan diperlukan",
  "Please login to upgrade your plan": "Sila log masuk untuk menaik taraf pelan anda",
  "Team Creation Limited": "Penciptaan Pasukan Terhad",
  
  // Projects
  "Clear Search": "Kosongkan Carian",
  "No teams found": "Tiada pasukan dijumpai",
  "{count} teams found": "{count} pasukan dijumpai",
  "Created On": "Dicipta Pada",
  "Owner": "Pemilik",
  "You": "Anda",
  "Member": "Ahli",
  "Checker": "Pemeriksa",
  "Viewer": "Pemerhati",
  "Quick Chat": "Perbualan Segera",
  "Team Members": "Ahli Pasukan",
  "No team members found": "Tiada ahli pasukan dijumpai",
  
  // Activity log
  "Recent Activity": "Aktiviti Terkini",
  "No recent activity": "Tiada aktiviti terkini",
  "Project ": "Projek ",
  " has been created.": " telah dicipta.",
  " has been updated.": " telah dikemas kini.",
  "Team ": "Pasukan ",
  " details has been updated.": " butiran telah dikemas kini.",
  "Team invitation sent to ": "Jemputan pasukan dihantar kepada ",
  "Team invitation for ": "Jemputan pasukan untuk ",
  
  // Project details
  "Project Details": "Butiran Projek",
  "Starred Teams": "Pasukan Berbintang",
  "Total Tasks": "Jumlah Tugas",
  "Project Teams": "Pasukan Projek",
  "All Teams": "Semua Pasukan",
  "Pending": "Menunggu",
  "On Hold": "Ditangguhkan",
  "Cancelled": "Dibatalkan",
  "No teams available": "Tiada pasukan tersedia",
  "No description provided": "Tiada penerangan disediakan",
  "Created": "Dicipta",
  
  // My tasks
  "Ref": "Rujukan",
  "Task not found": "Tugas tidak dijumpai",
  "Loading assigned users...": "Memuatkan pengguna yang ditugaskan...",
  "No description": "Tiada penerangan",
  "All": "Semua",
  "Me": "Saya",
  "Task has been created successfully": "Tugas telah berjaya dicipta",
  "Cannot select past date": "Tidak boleh memilih tarikh lampau",
  "Team": "Pasukan",
  "Section": "Bahagian",
  "Unknown Project": "Projek Tidak Diketahui",
  "Unknown Team": "Pasukan Tidak Diketahui",
  "Unknown Section": "Bahagian Tidak Diketahui",
  "Assignees": "Penerima Tugas",
  "Loading task details...": "Memuatkan butiran tugas...",
  "View in Original Project": "Lihat di Projek Asal",
  "Task details not found": "Butiran tugas tidak dijumpai",
  "Cannot delete a task that is referenced from a team project": "Tidak boleh memadam tugas yang dirujuk dari projek pasukan",
  "You don't have permission to edit this team task": "Anda tidak mempunyai kebenaran untuk menyunting tugas pasukan ini",
  "You are no longer a member of the team this task belongs to": "Anda bukan lagi ahli pasukan yang memiliki tugas ini",
  "Cannot delete a past due task": "Tidak boleh memadam tugas yang telah tamat tempoh",
  "Cannot edit a past due task": "Tidak boleh menyunting tugas yang telah tamat tempoh",
  "Tasks that are past their due date are locked for historical record keeping": "Tugas yang telah tamat tempoh dikunci untuk penyimpanan rekod sejarah",
  "Past due": "Tamat tempoh",
  
  // Notifications
  "Task deleted": "Tugas dipadam",
  "Task unassigned": "Tugas tidak ditugaskan",
  "Added to chat": "Ditambah ke perbualan",
  "Meeting invitation": "Jemputan mesyuarat",
  "Team invitation": "Jemputan pasukan",
  "Team announcement": "Pengumuman pasukan",
  
  // Errors
  "Character limit exceeded (1000 max)": "Had aksara melebihi (maksimum 1000)",
  
  // Create task
  "Failed to load users": "Gagal memuatkan pengguna",
  "Project Archived": "Projek Diarkibkan",
  "Project Not Public": "Projek Tidak Awam",
  "OK": "OK",
  "This project is not public. You can no longer create tasks in it.": "Projek ini tidak awam. Anda tidak lagi boleh mencipta tugas di dalamnya.",
  "This project has been archived. You can no longer create tasks in it.": "Projek ini telah diarkibkan. Anda tidak lagi boleh mencipta tugas di dalamnya.",
  "Task deleted successfully": "Tugas berjaya dipadam",
  "Failed to delete task": "Gagal memadam tugas",
  "Add Status": "Tambah Status",
  "Upgrade plan required": "Pelan naik taraf diperlukan",
  "Multiple users ({count})": "Berbilang pengguna ({count})",
  "No users": "Tiada pengguna",
  "Section Name required.": "Nama Bahagian diperlukan.",
  "Task Name must contain at least 2 characters and not more than 50 characters.": "Nama Tugas mesti mengandungi sekurang-kurangnya 2 aksara dan tidak lebih daripada 50 aksara.",
  "will be deleted.": "akan dipadam.",
  "Confirm Delete Task": "Sahkan Padam Tugas",
  "Are you sure you want to delete this task? This action cannot be undone.": "Adakah anda pasti ingin memadam tugas ini? Tindakan ini tidak boleh dibatalkan.",
  "Your project has been created successfully.": "Projek anda telah berjaya dicipta.",
  "Clear Selection": "Kosongkan Pilihan",
  "Workflow Tasks": "Tugas Aliran Kerja",
  "Manage Status Options": "Urus Pilihan Status",
  "Hide Status Manager": "Sembunyikan Pengurus Status"
};

// Read the missing translations files
const zhMissingPath = path.join(__dirname, 'output', 'zh_missing.json');
const myMissingPath = path.join(__dirname, 'output', 'my_missing.json');

// Function to process and translate missing entries
function translateMissingEntries(missingObj, translationsDict) {
  const result = {};
  
  function processObject(obj, result) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        result[key] = {};
        processObject(obj[key], result[key]);
      } else if (typeof obj[key] === 'string') {
        // Check if we have a translation for this string
        if (translationsDict[obj[key]]) {
          result[key] = translationsDict[obj[key]];
        } else if (translationsDict[key]) {
          // Try using the key as a fallback
          result[key] = translationsDict[key];
        } else {
          // Keep the English text if no translation is found
          result[key] = obj[key];
          console.log(`No translation found for: ${obj[key]}`);
        }
      } else {
        // Copy other types as-is
        result[key] = obj[key];
      }
    }
  }
  
  processObject(missingObj, result);
  return result;
}

try {
  // Read missing entries files
  const zhMissing = require('./output/zh_missing.json');
  const myMissing = require('./output/my_missing.json');
  
  // Translate missing entries
  const zhTranslated = translateMissingEntries(zhMissing, zhTranslations);
  const myTranslated = translateMissingEntries(myMissing, myTranslations);
  
  // Write translated files
  fs.writeFileSync(
    path.join(__dirname, 'output', 'zh_translated.json'),
    JSON.stringify(zhTranslated, null, 2),
    'utf8'
  );
  
  fs.writeFileSync(
    path.join(__dirname, 'output', 'my_translated.json'),
    JSON.stringify(myTranslated, null, 2),
    'utf8'
  );
  
  console.log('Translations generated successfully:');
  console.log(`- Chinese: ${path.join(__dirname, 'output', 'zh_translated.json')}`);
  console.log(`- Malay: ${path.join(__dirname, 'output', 'my_translated.json')}`);
  console.log('\nReview the translations and update if needed, then use merge_translations.js to apply them.');
  
} catch (error) {
  console.error('Error processing translations:', error);
} 