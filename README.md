# 💬 LanTalk内网聊天室系统

一个简单易用的内网聊天室系统，支持实时消息、多房间聊天和用户管理功能。

## 🤖 项目说明
本项目是在AI助手协助下开发的，用于学习和实践WebSocket实时通信技术。

## ✨ 功能特性

- 💬 **实时聊天** - 基于WebSocket的即时消息
- 🏠 **多房间支持** - 创建和加入不同聊天室  
- 👥 **用户管理** - 在线用户列表显示
- 🔇 **IP禁言** - 管理员禁言违规用户
- 📱 **响应式设计** - 适配电脑和手机
- 🛡️ **内网安全** - 专为内网环境设计

## 🛠️ 技术栈

**后端:**
- Node.js + Express
- Socket.IO (WebSocket)
- CORS跨域支持

**前端:**
- 原生HTML5/CSS3/JavaScript
- Socket.IO客户端
- 响应式CSS设计

## 🚀 快速开始

### 服务器部署

进入服务器目录：
```
cd server
```

安装依赖：
```
npm install
```

启动服务器：
```
node server.js
```

### 客户端使用
1. 打开 `client/index.html`
2. 输入服务器IP地址（如: 192.168.1.100）
3. 输入用户名开始聊天

### 管理功能
1. 打开 `admin/admin.html`
2. 进行用户管理和禁言操作

## 📁 项目结构

```
lan-chat-system/
├── server/          # 服务器端代码
├── client/          # 聊天客户端
├── admin/           # 管理面板
├── LICENSE          # MIT许可证
└── README.md        # 项目说明
```

## 🔧 API接口

### 服务器状态
```
GET /api/health
```

### 用户管理
```
GET /api/users
POST /api/mute-ip
POST /api/unmute-ip
```

### 房间管理
```
GET /api/rooms
```

## ⚠️ 注意事项

- 仅限内网环境使用
- 默认端口: 3001
- 管理员功能无密码验证，请谨慎使用
- 服务器重启后禁言列表会清空

## 📄 许可证

本项目采用 MIT License 开源许可证。

## 🙏 致谢

感谢AI助手在开发过程中的技术指导和支持。

感谢每个为我点star的人🙏。