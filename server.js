const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');
const userAgent = require('user-agent');
const fs = require('fs');
const path = require('path');
const { Entry, Setting } = require('./models/entry');  // 注意模型文件的路径和结构

const app = express();
app.use(bodyParser.json());
app.use(requestIp.mw());
app.use(express.static('views'));  // 允许访问 views 文件夹

// MongoDB Atlas 连接字符串 如果你想问我为什么不用别的数据库，我只能说我懒，而且这个数据库免费，我还不会用别的数据库
mongoose.connect('mongodb+srv://24hours:MuskZhouMQ%402024@cluster0.w5sbd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => console.log("Failed to connect to MongoDB", err));

// 定时器设置：每小时检查一次
setInterval(async () => {
    try {
        // 获取数据库中的最后一条记录
        const latestEntry = await Entry.findOne().sort({ createdAt: -1 });
        const setting = await Setting.findOne();

        if (latestEntry) {
            const now = new Date();
            const lastEntryTime = new Date(latestEntry.createdAt);
            
            // 计算时间差（毫秒），转换为小时
            const timeDifference = (now - lastEntryTime) / (1000 * 60 * 60);

            // 如果超过24小时，打包内容
            if (timeDifference > 24) {
                console.log("超过24小时没有新内容，开始打包过去的内容...");

                // 获取所有记录
                const entries = await Entry.find().sort({ createdAt: 1 });

                // 格式化为 JSON 内容
                const data = entries.map(entry => ({
                    content: entry.content,
                    timestamp: entry.createdAt
                }));

                // 定义文件路径
                const timestamp = new Date().toISOString().replace(/:/g, '-'); // 文件名时间戳，避免非法字符
                const filePath = path.join(__dirname, `entries-${timestamp}.json`);

                // 写入文件
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                console.log(`内容已打包为文件：${filePath}`);

                // 删除数据库中的所有内容
                await Entry.deleteMany({});
                console.log("所有内容已从数据库中删除。");

                // 更新或创建 `hasReset` 标志
                if (setting) {
                    setting.hasReset = true;
                    await setting.save();
                } else {
                    await Setting.create({ hasReset: true });
                }
            }
        }
    } catch (error) {
        console.error("检查或打包内容时出错：", error);
    }
}, 1000 * 60 * 60); // 每小时检查一次

// 获取所有输入内容和首次访问提示
app.get('/entries', async (req, res) => {
    const entries = await Entry.find().sort({ createdAt: -1 });
    const setting = await Setting.findOne();
    
    // 根据 hasReset 标志来确定首次访问提示信息
    let message;
    if (setting && setting.hasReset) {
        message = "网站已经经过一轮轮回，过去的内容已经存档并删除，现已开启新的轮回。";
    } else {
        message = "如果超过24小时无人更新内容，系统将自动删除过去的所有内容。";
    }

    res.json({ entries, message });
});

// 处理提交内容
app.post('/submit', async (req, res) => {
    const content = req.body.content;
    const ip = req.clientIp;
    const browserInfo = userAgent.parse(req.headers['user-agent']).toString();

    const newEntry = new Entry({ content, ip, browser: browserInfo });
    await newEntry.save();

    const entries = await Entry.find().sort({ createdAt: -1 });
    res.json({ entries });
});

app.listen(3031, () => {
    console.log('Server running on http://localhost:3031');
});
