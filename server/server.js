/**
 * LanTalk 聊天室服务器主文件
 * 功能：处理实时消息、用户管理、房间管理
 * 依赖：Express, Socket.IO
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');

// 简单的ID生成器
function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 获取本机IP地址
function getLocalIP() {
    try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const interfaceInfo of interfaces[name]) {
                if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                    if (name.includes('Wi-Fi') || name.includes('WLAN') || name.includes('Ethernet') || name.includes('本地连接')) {
                        return interfaceInfo.address;
                    }
                }
            }
        }
        for (const name of Object.keys(interfaces)) {
            for (const interfaceInfo of interfaces[name]) {
                if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                    return interfaceInfo.address;
                }
            }
        }
    } catch (error) {
        console.log('获取IP地址失败:', error);
    }
    return '127.0.0.1';
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const users = new Map();
const rooms = new Map();
const messages = new Map();
const mutedIPs = new Set();
const localIP = getLocalIP();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 创建默认房间
rooms.set('default', {
    id: 'default',
    name: '公共聊天室',
    users: [],
    created: Date.now()
});
messages.set('default', []);

// API路由
app.get('/', (req, res) => {
    res.json({
        name: '内网聊天室服务器',
        version: '1.0.0',
        status: 'running',
        serverIP: localIP,
        port: 3001,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        users: users.size,
        rooms: rooms.size,
        mutedIPs: mutedIPs.size,
        serverIP: localIP,
        timestamp: Date.now()
    });
});

app.get('/api/users', (req, res) => {
    const userList = Array.from(users.values()).map(user => ({
        id: user.id,
        username: user.username,
        ip: user.ip,
        isMuted: user.isMuted,
        joinTime: user.joinTime
    }));
    res.json(userList);
});

app.post('/api/mute-ip', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP地址不能为空' });

    mutedIPs.add(ip);
    users.forEach(user => {
        if (user.ip === ip) user.isMuted = true;
    });

    console.log(`IP ${ip} 已被禁言`);
    res.json({ success: true, message: `IP ${ip} 已被禁言` });
});

app.post('/api/unmute-ip', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP地址不能为空' });

    mutedIPs.delete(ip);
    users.forEach(user => {
        if (user.ip === ip) user.isMuted = false;
    });

    console.log(`IP ${ip} 已解除禁言`);
    res.json({ success: true, message: `IP ${ip} 已解除禁言` });
});

app.get('/api/muted-ips', (req, res) => {
    res.json(Array.from(mutedIPs));
});

app.post('/api/broadcast', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: '消息不能为空' });

    const adminMessage = {
        id: generateId(),
        type: 'admin',
        username: '管理员',
        content: message,
        timestamp: Date.now()
    };

    rooms.forEach((room, roomId) => {
        messages.get(roomId)?.push(adminMessage);
    });

    io.emit('message', adminMessage);
    res.json({ success: true, message: '广播发送成功' });
});

app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        userCount: room.users.length,
        created: room.created
    }));
    res.json(roomList);
});

// Socket.IO处理
io.on('connection', (socket) => {
    const clientIP = socket.handshake.address;
    console.log(`用户连接: ${socket.id} from ${clientIP}`);

    socket.on('join', (data) => {
        const { username, roomId = 'default' } = data;
        
        if (!username || username.length < 2 || username.length > 20) {
            socket.emit('error', '用户名长度应为2-20个字符');
            return;
        }
        
        const isIPMuted = mutedIPs.has(clientIP);
        const user = {
            id: generateId(),
            username,
            socketId: socket.id,
            joinTime: Date.now(),
            ip: clientIP,
            isMuted: isIPMuted
        };
        
        users.set(socket.id, user);
        socket.join(roomId);
        
        let room = rooms.get(roomId);
        if (!room) {
            room = {
                id: roomId,
                name: roomId,
                users: [],
                created: Date.now()
            };
            rooms.set(roomId, room);
            messages.set(roomId, []);
        }
        
        if (!room.users.find(u => u.socketId === socket.id)) {
            room.users.push(user);
        }
        
        const joinMessage = {
            id: generateId(),
            type: 'join',
            username: '系统',
            content: `${username} (IP: ${clientIP}) 加入了聊天室${isIPMuted ? ' [已被禁言]' : ''}`,
            timestamp: Date.now(),
            room: roomId,
            userIP: clientIP
        };
        
        messages.get(roomId)?.push(joinMessage);
        
        if (isIPMuted) {
            socket.emit('message', {
                id: generateId(),
                type: 'admin',
                username: '系统',
                content: '你的IP已被禁言，无法发送消息',
                timestamp: Date.now()
            });
        }
        
        socket.emit('message', joinMessage);
        socket.emit('message_history', (messages.get(roomId) || []).slice(-50));
        socket.to(roomId).emit('message', joinMessage);
        updateUserList(roomId);
        
        console.log(`用户 ${username} (IP: ${clientIP}) 加入房间 ${roomId}`);
    });

    socket.on('send_message', (data) => {
        const { content, roomId = 'default' } = data;
        const user = users.get(socket.id);
        
        if (!user) {
            socket.emit('error', '请先加入聊天室');
            return;
        }
        
        if (user.isMuted) {
            socket.emit('error', '你已被禁言，无法发送消息');
            return;
        }
        
        if (!content.trim()) return;
        
        const message = {
            id: generateId(),
            type: 'text',
            username: user.username,
            content: content.trim(),
            timestamp: Date.now(),
            room: roomId,
            userIP: user.ip
        };
        
        const roomMessages = messages.get(roomId) || [];
        roomMessages.push(message);
        io.to(roomId).emit('message', message);
        
        console.log(`消息 [${roomId}]: ${user.username} (IP: ${user.ip}): ${content}`);
    });

    socket.on('typing', (data) => {
        const { isTyping, roomId = 'default' } = data;
        const user = users.get(socket.id);
        
        if (user && !user.isMuted) {
            socket.to(roomId).emit('user_typing', {
                username: user.username,
                isTyping
            });
        }
    });

    socket.on('get_rooms', () => {
        const roomList = Array.from(rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            userCount: room.users.length
        }));
        socket.emit('room_list', roomList);
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            rooms.forEach((room, roomId) => {
                const userIndex = room.users.findIndex(u => u.socketId === socket.id);
                if (userIndex > -1) {
                    room.users.splice(userIndex, 1);
                    
                    const leaveMessage = {
                        id: generateId(),
                        type: 'leave',
                        username: '系统',
                        content: `${user.username} (IP: ${user.ip}) 离开了聊天室`,
                        timestamp: Date.now(),
                        room: roomId,
                        userIP: user.ip
                    };
                    
                    messages.get(roomId)?.push(leaveMessage);
                    socket.to(roomId).emit('message', leaveMessage);
                    updateUserList(roomId);
                }
            });
            
            users.delete(socket.id);
            console.log(`用户断开连接: ${user.username} (IP: ${user.ip})`);
        }
    });
});

function updateUserList(roomId) {
    const room = rooms.get(roomId);
    if (room) {
        io.to(roomId).emit('user_list', room.users.map(user => ({
            id: user.id,
            username: user.username,
            joinTime: user.joinTime,
            ip: user.ip,
            isMuted: user.isMuted
        })));
    }
}

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log('================================');
    console.log('🚀 内网聊天室服务器已启动');
    console.log(`📍 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 内网访问: http://${localIP}:${PORT}`);
    console.log(`📊 管理界面: http://${localIP}:${PORT}/api/health`);
    console.log('🛡️  功能特性:');
    console.log('   • IP禁言管理');
    console.log('   • 用户IP显示');
    console.log('   • 多房间支持');
    console.log('   • 管理员广播');
    console.log('================================');
    console.log('按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});
