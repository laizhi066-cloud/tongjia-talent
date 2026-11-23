/**
 * @description 图标注册表 — 集中管理 lucide-vue-next 图标映射
 * Sidebar 和 IconPicker 共用同一个映射
 * @file app/composables/useIcons.ts
 */
import {
  Settings, Users, Shield, List, FileText, SlidersHorizontal,
  BookOpen, Megaphone, LogIn, Menu, Activity, Layers, Wrench,
  Briefcase, Home, User, Key, Lock, Mail, Search, Trash2, Pencil,
  Plus, X, Check, BarChart3, BarChart, PieChart, Bell, Calendar,
  Clock, MapPin, Map, Flag, Gauge, GitBranch, Cloud,
  Server, Image, Video, Music, MessageSquare, Phone, Globe, Link,
  Box, Diamond, Sparkles, Leaf, Droplets, Sun, Moon, Star, Heart,
  Share2, Download, CloudUpload, ShieldCheck, RefreshCw, LockOpen,
  Eye, EyeOff, AlertCircle, CheckCircle, XCircle, Info, HelpCircle,
  Palette, Building2, TableProperties, Tag, Send, AlertTriangle, UserCheck, Store, Network,
  Columns3, Plug, Rocket, Handshake, Inbox, Compass,
} from 'lucide-vue-next'

export interface IconEntry {
  label: string
  name: string
  component: Component
}

/** 全部可用图标列表（用于 IconPicker 选择器） */
export const allIcons: IconEntry[] = [
  // 导航 & 布局
  { label: '首页', name: 'home', component: Home },
  { label: '菜单', name: 'menu', component: Menu },
  { label: '设置', name: 'settings', component: Settings },
  { label: '选项', name: 'sliders', component: SlidersHorizontal },
  { label: '主题', name: 'palette', component: Palette },
  { label: '层级', name: 'layers', component: Layers },
  { label: '方向', name: 'compass', component: Compass },
  { label: '列表', name: 'list', component: List },
  { label: '分栏', name: 'columns-3', component: Columns3 },
  { label: '文档', name: 'file-text', component: FileText },
  // 用户 & 权限
  { label: '用户', name: 'users', component: Users },
  { label: '个人', name: 'user', component: User },
  { label: '用户审核', name: 'user-check', component: UserCheck },
  { label: '角色', name: 'shield', component: Shield },
  { label: '授权', name: 'shield-check', component: ShieldCheck },
  { label: '权限', name: 'key', component: Key },
  { label: '锁定', name: 'lock', component: Lock },
  { label: '解锁', name: 'lock-open', component: LockOpen },
  // 部门 & 组织
  { label: '部门', name: 'briefcase', component: Briefcase },
  { label: '分支', name: 'git-branch', component: GitBranch },
  { label: '旗帜', name: 'flag', component: Flag },
  // 日志 & 监控
  { label: '活动', name: 'activity', component: Activity },
  { label: '仪表', name: 'gauge', component: Gauge },
  { label: '统计', name: 'bar-chart-3', component: BarChart3 },
  { label: '柱状图', name: 'bar-chart', component: BarChart },
  { label: '饼图', name: 'pie-chart', component: PieChart },
  // 通知 & 消息
  { label: '通知', name: 'megaphone', component: Megaphone },
  { label: '楼宇', name: 'building-2', component: Building2 },
  { label: '组织', name: 'store', component: Store },
  { label: '网络', name: 'network', component: Network },
  { label: '合作', name: 'handshake', component: Handshake },
  { label: '收件箱', name: 'inbox', component: Inbox },
  { label: '属性', name: 'table-properties', component: TableProperties },
  { label: '铃铛', name: 'bell', component: Bell },
  { label: '聊天', name: 'message-square', component: MessageSquare },
  { label: '邮件', name: 'mail', component: Mail },
  { label: '电话', name: 'phone', component: Phone },
  // 内容 & 媒体
  { label: '书本', name: 'book-open', component: BookOpen },
  { label: '日志', name: 'log-in', component: LogIn },
  { label: '图片', name: 'image', component: Image },
  { label: '视频', name: 'video', component: Video },
  { label: '音乐', name: 'music', component: Music },
  // 通用强调
  { label: '星星', name: 'star', component: Star },
  { label: '钻石', name: 'diamond', component: Diamond },
  { label: '火花', name: 'sparkles', component: Sparkles },
  // 地点 & 时间
  { label: '日历', name: 'calendar', component: Calendar },
  { label: '时间', name: 'clock', component: Clock },
  { label: '位置', name: 'map-pin', component: MapPin },
  { label: '地图', name: 'map', component: Map },
  // 自然 & 天气
  { label: '叶子', name: 'leaf', component: Leaf },
  { label: '水滴', name: 'droplets', component: Droplets },
  { label: '太阳', name: 'sun', component: Sun },
  { label: '月亮', name: 'moon', component: Moon },
  // 操作
  { label: '搜索', name: 'search', component: Search },
  { label: '新增', name: 'plus', component: Plus },
  { label: '编辑', name: 'pencil', component: Pencil },
  { label: '删除', name: 'trash-2', component: Trash2 },
  { label: '关闭', name: 'x', component: X },
  { label: '勾选', name: 'check', component: Check },
  { label: '分享', name: 'share-2', component: Share2 },
  { label: '下载', name: 'download', component: Download },
  { label: '上传', name: 'cloud-upload', component: CloudUpload },
  { label: '刷新', name: 'refresh-cw', component: RefreshCw },
  // 工具
  { label: '工具', name: 'wrench', component: Wrench },
  { label: '方块', name: 'box', component: Box },
  { label: '地球', name: 'globe', component: Globe },
  { label: '链接', name: 'link', component: Link },
  { label: '插件', name: 'plug', component: Plug },
  { label: '启动', name: 'rocket', component: Rocket },
  { label: '云', name: 'cloud', component: Cloud },
  { label: '服务器', name: 'server', component: Server },
  // 状态
  { label: '警告', name: 'alert-circle', component: AlertCircle },
  { label: '成功', name: 'check-circle', component: CheckCircle },
  { label: '错误', name: 'x-circle', component: XCircle },
  { label: '信息', name: 'info', component: Info },
  { label: '帮助', name: 'help-circle', component: HelpCircle },
  { label: '心', name: 'heart', component: Heart },
  { label: '眼睛', name: 'eye', component: Eye },
  { label: '隐藏', name: 'eye-off', component: EyeOff },
  // 通用数据与状态
  { label: '标签', name: 'tag', component: Tag },
  { label: '群发', name: 'send', component: Send },
  { label: '错误监控', name: 'alert-triangle', component: AlertTriangle },
]

/** name → component 的快速查找表（Sidebar 用） */
export function buildIconMap(): Record<string, Component> {
  const map: Record<string, Component> = {}
  for (const icon of allIcons) {
    map[icon.name] = icon.component
  }

  // 兼容数据库中存储的 PascalCase 命名（如 "Settings" → "settings"）
  for (const icon of allIcons) {
    const pascal = icon.name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
    if (pascal && !(pascal in map)) {
      map[pascal] = icon.component
    }
    // 驼峰兼容
    const camel = icon.name.split('-').map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join('')
    if (camel !== icon.name && !(camel in map)) {
      map[camel] = icon.component
    }
  }

  // 额外别名：部分 DB 图标名无法通过规则自动转换
  map['User'] = map['user']!
  map['LogIn'] = map['log-in']!
  map['UserCheck'] = map['user-check']!
  map['Bell'] = map['bell']!
  map['FileText'] = map['file-text']!
  map['Activity'] = map['activity']!
  return map
}
