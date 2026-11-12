import { createRouter, createWebHistory } from "vue-router";

const routes = [
    // —— 原有首页 / 留言墙路由，保持不变 ——
    {
        path: '/',
        redirect: '/wall?id=0',
        name: 'index',
        component: () =>
            import ('../views/YikeIndex'),
        children: [{
            path: 'wall',
            component: () =>
                import ('../views/WallMessage')
        }]
    },
    // —— 登录、注册（游客可访问）——
    {
        path: '/login',
        name: 'Login',
        component: () =>
            import ('../views/Login.vue')
    },
    {
        path: '/register',
        name: 'Register',
        component: () =>
            import ('../views/Register.vue')
    },
    // —— 个人空间（需登录，普通用户使用，管理员走 /admin）——
    {
        path: '/user-space',
        name: 'UserSpace',
        component: () =>
            import ('../views/UserSpace.vue')
    },
    // —— 管理员后台（需登录 + role===1，由守卫判断）——
    // /admin 作为父布局，AdminIndex 内部的 <router-view> 渲染下列子页面
    {
        path: '/admin',
        name: 'Admin',
        redirect: '/admin/index',
        component: () =>
            import ('../views/admin/AdminIndex.vue'),
        children: [{
                path: 'index',
                name: 'AdminDashboard',
                component: () =>
                    import ('../views/admin/Dashboard.vue')
            },
            {
                path: 'card',
                name: 'AdminCard',
                component: () =>
                    import ('../views/admin/CardManage.vue')
            },
            {
                path: 'tag',
                name: 'AdminTag',
                component: () =>
                    import ('../views/admin/TagManage.vue')
            },
            {
                path: 'user',
                name: 'AdminUser',
                component: () =>
                    import ('../views/admin/UserManage.vue')
            },
            {
                path: 'comment',
                name: 'AdminComment',
                component: () =>
                    import ('../views/admin/CommentManage.vue')
            }
        ]
    }
]

// ?
const router = createRouter({
    history: createWebHistory(),
    routes,
})

// 免登录白名单
const WHITE_LIST = ['/login', '/register']

// 安全解析 localStorage 里的 userInfo：try-catch 包住 JSON.parse
// 解析成功返回对象；失败/为空返回 null
const getUserInfo = () => {
    try {
        const raw = localStorage.getItem('userInfo')
        return raw ? JSON.parse(raw) : null
    } catch (err) {
        return null
    }
}

// 全局前置守卫（仅做前端体验拦截，真正权限以后端为准）
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')

    // 规则1：白名单页面
    if (WHITE_LIST.includes(to.path)) {
        // 无 token：直接放行
        if (!token) {
            return next()
        }
        // 有 token：解析 userInfo，失败则清理并跳登录
        const userInfo = getUserInfo()
        if (!userInfo) {
            localStorage.removeItem('token')
            localStorage.removeItem('userInfo')
            return next('/login')
        }
        // 规则4：已登录再访问登录/注册页，管理员去后台，其他去首页
        return next(Number(userInfo.role) === 1 ? '/admin/index' : '/')
    }

    // 规则2：非白名单且无 token，一律跳登录
    if (!token) {
        return next('/login')
    }

    // 规则3：有 token，解析 userInfo
    const userInfo = getUserInfo()
    if (!userInfo) {
        // JSON 解析失败：清 token、userInfo，跳 /login 并 return
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        return next('/login')
    }

    // 规则5：访问 /admin 开头的路由，必须是管理员，否则强制回首页
    if (to.path.startsWith('/admin')) {
        if (Number(userInfo.role) === 1) {
            return next()
        }
        return next('/')
    }

    // 规则6：个人空间只给普通用户，管理员强制去后台
    if (to.path === '/user-space' && Number(userInfo.role) === 1) {
        return next('/admin/index')
    }

    // 其他已登录正常页面，放行
    next()
})

export default router;
