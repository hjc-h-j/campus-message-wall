const controller = require('../controller/dbServe')
const jwt = require('jsonwebtoken')
const { pool } = require('../lib/db')
const config = require('../config/default')

/*
 * tokenVerify：只解析、不拦截
 * 成功 -> req.user = {id, username, role}
 * 无 token / 过期 / 伪造 -> req.user = null，照常 next()
 * 是否必须登录、是否管理员，交给具体路由或 adminAuth 判断
 */
const tokenVerify = (req, res, next) => {
    const auth = req.headers.authorization || ''
        // 只认 "Bearer xxx"
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token) {
        req.user = null
        return next()
    }
    try {
        req.user = jwt.verify(token, config.jwtSecret)
    } catch (err) {
        req.user = null
    }
    next()
}

/*
 * adminAuth：管理员鉴权，必须在 tokenVerify 之后对具体路由使用（不要全局 app.use）
 * 未登录 / role 不是 1 -> 统一格式 403，data 为 null
 * 用法：app.post('/xxx', adminAuth, handler)
 */
const adminAuth = (req, res, next) => {
    if (!req.user || req.user.role !== 1) {
        return res.json({ code: 403, msg: '无权限，需要管理员身份', data: null })
    }
    next()
}

module.exports = function(app) {
    // 全局解析 token（无副作用，游客无 token 也能正常访问）
    app.use(tokenVerify)

    app.get('/test', (req, res) => {
            res.type('html');
            res.render('test');
        })
        //新增留言
    app.post('/insertwall', (req, res) => {
            controller.insertWall(req, res)
        })
        //新增反馈
    app.post('/insertfeedback', (req, res) => {
            controller.insertFeedback(req, res)
        })
        //新增评论
    app.post('/insertcomment', (req, res) => {
            controller.insertComment(req, res)
        })
        //删除留言
    app.post('/deletewall', (req, res) => {
            controller.deleteWall(req, res)
        })
        //删除反馈
    app.post('/deletefeedback', (req, res) => {
            controller.deleteFeedback(req, res)
        })
        //删除评论
    app.post('/deletecomment', (req, res) => {
            controller.deleteComment(req, res)
        })
        //分页查询留言
    app.post('/findwallpage', (req, res) => {
            controller.findWallPage(req, res)
        })
        //分页查询评论
    app.post('/findcommentpage', (req, res) => {
            controller.findCommentPage(req, res)
        })
        //查询标签列表（可传type:0留言墙 1照片墙）
    app.post('/findlabel', (req, res) => {
        controller.findLabel(req, res)
    })


    // 用户进入ip登记
    app.post('/signip', (req, res) => {
        var ip = req.ip;
        res.send({
            code: 200,
            ip: ip,
        })
    })

    // ==================== 用户认证 ====================

    // 注册
    app.post('/api/register', async(req, res) => {
        // trim 后校验：必填、用户名 3~20 位且仅字母数字下划线、密码 6~20 位
        const username = String((req.body && req.body.username) || '').trim()
        const password = String((req.body && req.body.password) || '').trim()
        if (!username || !password) {
            return res.json({ code: 400, msg: '用户名和密码不能为空', data: null })
        }
        if (username.length < 3 || username.length > 20) {
            return res.json({ code: 400, msg: '用户名长度需为 3~20 个字符', data: null })
        }
        if (!/^\w+$/.test(username)) {
            return res.json({ code: 400, msg: '用户名只能包含字母、数字和下划线', data: null })
        }
        if (password.length < 6 || password.length > 20) {
            return res.json({ code: 400, msg: '密码长度需为 6~20 个字符', data: null })
        }
        try {
            const [rows] = await pool.query(
                'SELECT id FROM user WHERE username = ? LIMIT 1', [username]
            )
            if (rows.length > 0) {
                return res.json({ code: 400, msg: '该用户名已被注册', data: null })
            }

            // role 默认 0 普通用户，1管理员
            await pool.query(
                'INSERT INTO user (username, password, role) VALUES (?, ?, 0)', [username, password]
            )
            res.json({ code: 200, msg: '注册成功', data: null })
        } catch (err) {
            console.error('注册失败：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 登录
    app.post('/api/login', async(req, res) => {
        const { username, password } = req.body || {}
        if (!username || !password) {
            return res.json({ code: 400, msg: '账号或密码错误', data: null })
        }
        try {
            const [rows] = await pool.query(
                'SELECT id, username, password, role, imgurl FROM user WHERE username = ? LIMIT 1', [username]
            )
            const user = rows[0]

            // 账号不存在或密码错误统一提示，避免暴露账号是否存在
            // 明文仅演示；实际用 bcrypt.compare(password, user.password)
            if (!user || user.password !== password) {
                return res.json({ code: 400, msg: '账号或密码错误', data: null })
            }

            // payload 含身份与角色，权限以后端解析出的 role 为准
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role },
                config.jwtSecret, { expiresIn: '24h' }
            )

            // 解构剔除 password，userInfo 不返回密码
            const { password: _pwd, ...userInfo } = user
            res.json({
                code: 200,
                msg: '登录成功',
                data: { token, userInfo }
            })
        } catch (err) {
            console.error('登录失败：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // ==================== 管理员接口 ====================

    // 仪表盘统计：管理员专用
    app.get('/api/admin/dashboard', adminAuth, async(req, res) => {
        try {
            // 四条独立 count 查询，逻辑清晰、便于维护
            // COUNT 返回 BIGINT，mysql2 可能串化，统一 Number 转数字
            const [
                [wall]
            ] = await pool.query('SELECT COUNT(*) AS c FROM walls')
            const [
                [text]
            ] = await pool.query('SELECT COUNT(*) AS c FROM walls WHERE type = ?', [0])
            const [
                [img]
            ] = await pool.query('SELECT COUNT(*) AS c FROM walls WHERE type = ?', [1])
            const [
                [cmt]
            ] = await pool.query('SELECT COUNT(*) AS c FROM comments')

            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    total: Number(wall.c), // walls 总数量
                    textCount: Number(text.c), // type=0 留言墙数量
                    imgCount: Number(img.c), // type=1 照片墙数量
                    commentCount: Number(cmt.c) // comments 总数量
                }
            })
        } catch (err) {
            console.error('仪表盘统计异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 卡片分页列表：管理员专用
    app.get('/api/admin/walls', adminAuth, async(req, res) => {
        try {
            // 分页参数：page 默认 1，pagesize 默认 10；兜底非数字/负数
            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // type 可选：不传查全部，传 0/1 按类型过滤
            // 用 hasType 判断是否传了 type，避免 type=0 被当作 falsy 跳过
            const hasType = req.query.type !== undefined
            const type = hasType ? parseInt(req.query.type) : -1

            // ? 占位符，禁止拼接；LIMIT/OFFSET 也用占位符传整数
            // 实际列名为 imgurl（非 img），与项目前端字段一致
            let sql = 'SELECT id, message, imgurl, type, label, color, moment, userId FROM walls'
            let args = []
            if (hasType && (type === 0 || type === 1)) {
                sql += ' WHERE type = ?'
                args.push(type)
            }
            sql += ' ORDER BY id DESC LIMIT ? OFFSET ?'
            args.push(pagesize, offset)

            const [list] = await pool.query(sql, args)

            // total 单独 count，便于前端分页器
            let countSql = 'SELECT COUNT(*) AS c FROM walls'
            let countArgs = []
            if (hasType && (type === 0 || type === 1)) {
                countSql += ' WHERE type = ?'
                countArgs.push(type)
            }
            const [
                [{ c }]
            ] = await pool.query(countSql, countArgs)

            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    list, // 当前页数据
                    total: Number(c), // 总条数
                    page, // 当前页码
                    pagesize // 每页条数
                }
            })
        } catch (err) {
            console.error('卡片分页列表异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 用户分页列表：管理员专用
    app.get('/api/admin/users', adminAuth, async(req, res) => {
        try {
            // 分页参数：字符串转 Number；page 默认 1，pagesize 默认 10；兜底 <1
            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // 显式指定字段，禁止返回 password；? 占位符
            const [list] = await pool.query(
                'SELECT id, username, imgurl, role FROM user ORDER BY id DESC LIMIT ? OFFSET ?', [pagesize, offset]
            )

            // 总条数用 COUNT(1)
            const [
                [{ c }]
            ] = await pool.query('SELECT COUNT(1) AS c FROM user')

            // id、role 可能是 BigInt，统一转普通 Number，避免前端序列化问题
            const listSafe = list.map(u => ({
                ...u,
                id: Number(u.id),
                role: Number(u.role)
            }))

            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    list: listSafe,
                    total: Number(c), // 总条数
                    page, // 当前页码
                    pagesize // 每页条数
                }
            })
        } catch (err) {
            console.error('用户分页列表异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 管理员分页列表：管理员专用，仅返回 role=1 的用户
    app.get('/api/admin/admins', adminAuth, async(req, res) => {
        try {
            // 分页参数：字符串转 Number；page 默认 1，pagesize 默认 10；兜底 <1
            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // 显式指定字段，禁止返回 password；只查 role=1 的管理员；? 占位符
            const [list] = await pool.query(
                'SELECT id, username, imgurl, role FROM user WHERE role = 1 ORDER BY id DESC LIMIT ? OFFSET ?', [pagesize, offset]
            )

            // 总条数用 COUNT(1)，条件与列表查询保持一致（只统计管理员）
            const [
                [{ c }]
            ] = await pool.query('SELECT COUNT(1) AS c FROM user WHERE role = 1')

            // id、role 可能是 BigInt，统一转普通 Number
            const listSafe = list.map(u => ({
                ...u,
                id: Number(u.id),
                role: Number(u.role)
            }))

            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    list: listSafe,
                    total: Number(c), // 管理员总条数
                    page, // 当前页码
                    pagesize // 每页条数
                }
            })
        } catch (err) {
            console.error('管理员分页列表异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 评论分页列表：管理员专用，联表 walls 显示所属卡片内容
    app.get('/api/admin/comments', adminAuth, async(req, res) => {
        try {
            // 分页参数：字符串转 Number；page 默认 1，pagesize 默认 10；兜底 <1
            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // 联表查询：comments LEFT JOIN walls
            // 数据库实际评论内容列名为 comment，用 AS content 映射为前端期望字段名
            // LEFT JOIN：即使所属卡片已删除，评论仍查出，wallMessage 为 null
            // 显式指定字段，禁止 SELECT *；? 占位符
            const [list] = await pool.query(
                'SELECT c.id, c.wallId, c.comment AS content, c.userId, c.moment, w.message AS wallMessage ' +
                'FROM comments c LEFT JOIN walls w ON c.wallId = w.id ' +
                'ORDER BY c.id DESC LIMIT ? OFFSET ?', [pagesize, offset]
            )

            // 总条数用 COUNT(1)，仅统计 comments 表
            const [
                [{ c }]
            ] = await pool.query('SELECT COUNT(1) AS c FROM comments')

            // mysql2 返回 id、wallId 为 BigInt，统一转普通 Number
            // 注意：userId 在库中是 VARCHAR(60)，游客存 IP、登录用户存数字 id 字符串
            // 不能对它做 Number()，否则游客 IP（如 "::1"）会变成 NaN，JSON 序列化后丢失
            const listSafe = list.map(item => ({
                ...item,
                id: Number(item.id),
                wallId: Number(item.wallId)
            }))

            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    list: listSafe, // 当前页数据（每条含 id, wallId, content, userId, moment, wallMessage）
                    total: Number(c), // 评论总条数
                    page, // 当前页码
                    pagesize // 每页条数
                }
            })
        } catch (err) {
            console.error('评论分页列表异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 删除评论：管理员专用
    app.delete('/api/admin/comment/:id', adminAuth, async(req, res) => {
        try {
            // 路径参数 id：字符串转 Number，必须是正整数
            const id = Number(req.params.id)
            if (!Number.isInteger(id) || id < 1) {
                return res.json({ code: 400, msg: '非法id', data: null })
            }

            // 存在性校验：只用 SELECT 1 判断有无，不取完整数据
            const [exist] = await pool.query('SELECT 1 FROM comments WHERE id = ? LIMIT 1', [id])
            if (exist.length === 0) {
                return res.json({ code: 400, msg: '该评论不存在', data: null })
            }

            // 通过校验后执行删除，? 占位符
            await pool.query('DELETE FROM comments WHERE id = ?', [id])

            res.json({ code: 200, msg: '删除成功', data: null })
        } catch (err) {
            console.error('删除评论异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 编辑卡片：管理员专用
    app.put('/api/admin/wall/:id', adminAuth, async(req, res) => {
        try {
            // 路径参数 id 校验：必须是正整数
            const id = Number(req.params.id)
            if (!Number.isInteger(id) || id < 1) {
                return res.json({ code: 400, msg: '非法id', data: null })
            }

            // 只允许接收 message、label、color 三个字段（防止多余字段注入）
            const { message, label, color } = req.body || {}

            // 业务校验2：至少传入一个要修改的字段
            if (message === undefined && label === undefined && color === undefined) {
                return res.json({ code: 400, msg: '至少传入一个要修改的字段', data: null })
            }

            // 业务校验1：先查询该 id 记录是否存在
            const [exist] = await pool.query('SELECT id FROM walls WHERE id = ? LIMIT 1', [id])
            if (exist.length === 0) {
                return res.json({ code: 400, msg: '该留言不存在', data: null })
            }

            // 动态构建 SET 片段：条件数组放 '字段=?'，参数数组放实际值
            // 只更新 body 实际传过来的字段，避免 undefined 覆盖原有数据
            const setClauses = []
            const params = []
            if (message !== undefined) {
                setClauses.push('message = ?');
                params.push(message)
            }
            if (label !== undefined) {
                setClauses.push('label   = ?');
                params.push(label)
            }
            if (color !== undefined) {
                setClauses.push('color   = ?');
                params.push(color)
            }

            // 最后把 id 追加进参数数组，对应 WHERE id = ?
            params.push(id)

            await pool.query(`UPDATE walls SET ${setClauses.join(', ')} WHERE id = ?`, params)

            res.json({ code: 200, msg: '修改成功', data: null })
        } catch (err) {
            console.error('编辑卡片异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 删除卡片（联动删评论+点赞）：管理员专用
    app.delete('/api/admin/wall/:id', adminAuth, async(req, res) => {
        // 先声明连接，便于 catch 里也能 release
        let conn
        try {
            // 路径参数 id 校验：必须是正整数
            const id = Number(req.params.id)
            if (!Number.isInteger(id) || id < 1) {
                return res.json({ code: 400, msg: '非法id', data: null })
            }

            // 业务校验：先查 walls 表判断 id 是否存在
            const [exist] = await pool.query('SELECT id FROM walls WHERE id = ? LIMIT 1', [id])
            if (exist.length === 0) {
                return res.json({ code: 400, msg: '该留言不存在', data: null })
            }

            // 从连接池拿连接，开启事务，保证三条删除原子性
            conn = await pool.getConnection()
            await conn.beginTransaction()

            // ① 删除 comments 表中 wallId = id 的评论
            await conn.query('DELETE FROM comments WHERE wallId = ?', [id])

            // ② 删除 feedbacks 表中 wallId = id 的点赞
            await conn.query('DELETE FROM feedbacks WHERE wallId = ?', [id])

            // ③ 删除 walls 表对应 id 的留言
            await conn.query('DELETE FROM walls WHERE id = ?', [id])

            // 三条全部成功才提交
            await conn.commit()
            res.json({ code: 200, msg: '删除成功', data: null })
        } catch (err) {
            // 任意一步失败：回滚事务，保证数据一致
            if (conn) {
                try { await conn.rollback() } catch (_) {}
            }
            console.error('删除卡片异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        } finally {
            // 无论成功失败都把连接还回连接池
            if (conn) conn.release()
        }
    })

    // 标签列表：管理员专用
    app.get('/api/admin/tags', adminAuth, async(req, res) => {
        try {
            // 固定 SQL，禁止 SELECT *；用别名 label_name AS name 对齐前端字段名
            const [list] = await pool.query(
                    'SELECT id, label_name AS name, type FROM label ORDER BY id ASC'
                )
                // id 可能返回 BigInt，遍历 list 用 Number() 转成普通 JS 数字
            const result = list.map(item => ({...item, id: Number(item.id) }))
            res.json({ code: 200, msg: 'ok', data: { list: result } })
        } catch (err) {
            console.error('标签列表异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 新增标签：管理员专用
    app.post('/api/admin/tag', adminAuth, async(req, res) => {
        try {
            const { label_name, type } = req.body || {}

            // ① label_name 去除首尾空格后不能为空
            const name = String(label_name || '').trim()
            if (!name) {
                return res.json({ code: 400, msg: '标签名称不能为空', data: null })
            }

            // ② type 必须转为 Number 后是 0 或 1（req.body 可能传字符串 "0"/"1"）
            const typeNum = Number(type)
            if (typeNum !== 0 && typeNum !== 1) {
                return res.json({ code: 400, msg: 'type只能为0或1', data: null })
            }

            // 重复校验：同一个 type 下 label_name 不能重复
            const [exist] = await pool.query(
                'SELECT id FROM label WHERE label_name = ? AND type = ? LIMIT 1', [name, typeNum]
            )
            if (exist.length > 0) {
                return res.json({ code: 400, msg: '该类型下此标签已存在', data: null })
            }

            // 全部校验通过，执行插入
            await pool.query(
                'INSERT INTO label (label_name, type) VALUES (?, ?)', [name, typeNum]
            )

            res.json({ code: 200, msg: '新增成功', data: null })
        } catch (err) {
            console.error('新增标签异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 编辑标签：管理员专用，全量更新
    app.put('/api/admin/tag/:id', adminAuth, async(req, res) => {
        try {
            // 路径参数 id：字符串转 Number，必须是正整数
            const id = Number(req.params.id)
            if (!Number.isInteger(id) || id < 1) {
                return res.json({ code: 400, msg: '非法id', data: null })
            }

            const { label_name, type } = req.body || {}

            // ① label_name 去除首尾空格后不能为空
            const name = String(label_name || '').trim()
            if (!name) {
                return res.json({ code: 400, msg: '标签名称不能为空', data: null })
            }

            // ② label_name 长度不能超过 50 个字符
            if (name.length > 50) {
                return res.json({ code: 400, msg: '标签名称过长', data: null })
            }

            // ③ type 转数字后必须是 0 或 1
            const typeNum = Number(type)
            if (typeNum !== 0 && typeNum !== 1) {
                return res.json({ code: 400, msg: 'type只能为0或1', data: null })
            }

            // 业务校验：先查 id 是否存在
            const [exist] = await pool.query('SELECT id FROM label WHERE id = ? LIMIT 1', [id])
            if (exist.length === 0) {
                return res.json({ code: 400, msg: '该标签不存在', data: null })
            }

            // 重复校验：排除自身 id，同一 type 下 label_name 不能重复
            const [dup] = await pool.query(
                'SELECT id FROM label WHERE label_name = ? AND type = ? AND id <> ? LIMIT 1', [name, typeNum, id]
            )
            if (dup.length > 0) {
                return res.json({ code: 400, msg: '该类型下此标签已存在', data: null })
            }

            // 全部校验通过，执行全量更新
            await pool.query(
                'UPDATE label SET label_name = ?, type = ? WHERE id = ?', [name, typeNum, id]
            )

            res.json({ code: 200, msg: '修改成功', data: null })
        } catch (err) {
            console.error('编辑标签异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 删除标签：管理员专用
    app.delete('/api/admin/tag/:id', adminAuth, async(req, res) => {
        try {
            // 路径参数 id：字符串转 Number，必须是正整数
            const id = Number(req.params.id)
            if (!Number.isInteger(id) || id < 1) {
                return res.json({ code: 400, msg: '非法id', data: null })
            }

            // 业务校验：先查 label 表判断 id 是否存在
            const [exist] = await pool.query('SELECT 1 FROM label WHERE id = ? LIMIT 1', [id])
            if (exist.length === 0) {
                return res.json({ code: 400, msg: '该标签不存在', data: null })
            }

            // 引用校验：查 walls 表是否有 label = 该 id 的记录
            // 只判断有无，不取完整数据，使用 SELECT 1 ... LIMIT 1
            const [used] = await pool.query('SELECT 1 FROM walls WHERE label = ? LIMIT 1', [id])
            if (used.length > 0) {
                return res.json({ code: 400, msg: '该标签正在被使用，无法删除', data: null })
            }

            // 全部校验通过，执行删除
            await pool.query('DELETE FROM label WHERE id = ?', [id])

            res.json({ code: 200, msg: '删除成功', data: null })
        } catch (err) {
            console.error('删除标签异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 回复评论：登录用户和游客都能用，不用 adminAuth
    app.post('/api/reply', tokenVerify, async(req, res) => {
        try {
            const { wallId, parentId, comment, name, imgurl } = req.body || {}

            // 参数校验：wallId、parentId 必须是正整数
            const wid = Number(wallId)
            const pid = Number(parentId)
            if (!Number.isInteger(wid) || wid < 1) {
                return res.json({ code: 400, msg: '非法wallId', data: null })
            }
            if (!Number.isInteger(pid) || pid < 1) {
                return res.json({ code: 400, msg: '非法parentId', data: null })
            }
            // 回复内容非空（去空格后判断）
            const content = String(comment || '').trim()
            if (!content) {
                return res.json({ code: 400, msg: '回复内容不能为空', data: null })
            }

            // 身份：登录用 token 里的 id，游客用 IP；comments.userId 是 VARCHAR，统一转字符串
            const operatorId = req.user ? String(req.user.id) : req.ip

            // 一次查出被回复评论的归属卡 wallId 和作者 userId：
            // 既做「存在 + 同卡」校验，又给后面写消息用，避免重复查询
            const [parents] = await pool.query(
                'SELECT id, wallId, userId FROM comments WHERE id = ? LIMIT 1', [pid]
            )
            if (parents.length === 0) {
                return res.json({ code: 400, msg: '该评论不存在', data: null })
            }
            if (Number(parents[0].wallId) !== wid) {
                return res.json({ code: 400, msg: '该评论不属于此卡片', data: null })
            }
            const target = parents[0]

            // 插入回复：name 存填写的签名（空串时查询联表 username 兜底），登录用户与游客一致
            const [ins] = await pool.query(
                'INSERT INTO comments (wallId, parentId, userId, imgurl, comment, moment, name) VALUES (?, ?, ?, ?, ?, ?, ?)', [wid, pid, operatorId, imgurl || '', content, new Date().toISOString(), String(name || '').trim()]
            )

            // 写消息：被回复人不是自己才写；失败只记日志，不影响回复主流程
            if (String(target.userId) !== operatorId) {
                try {
                    // fromName：登录用用户名，游客用传的 name，兜底「游客」
                    const fromName = req.user ? req.user.username : (String(name || '').trim() || '游客')
                    await pool.query(
                        'INSERT INTO message (userId, type, wallId, commentId, fromUserId, fromName, content, isRead, moment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                            target.userId, // 被回复人
                            3, // type=3 回复
                            wid,
                            pid, // 关联被回复的评论
                            operatorId, // 操作者 id
                            fromName,
                            content.slice(0, 50), // 回复内容前 50 字
                            0, // 未读
                            new Date().toISOString()
                        ]
                    )
                } catch (msgErr) {
                    console.error('写回复消息异常：', msgErr)
                }
            }

            res.json({ code: 200, msg: '回复成功', data: { insertId: ins.insertId } })
        } catch (err) {
            console.error('回复评论异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // ==================== 消息通知接口 ====================

    // 接口1：查我的消息（分页 + 未读数）
    app.get('/api/user/messages', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            // 分页参数：字符串转 Number；page 默认 1，pagesize 默认 10；兜底 <1
            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // message.userId 是 VARCHAR(60)，登录用户存数字 id 字符串
            const uid = String(req.user.id)

            // 显式字段，禁止 SELECT *
            const [list] = await pool.query(
                'SELECT id, type, wallId, commentId, fromUserId, fromName, content, isRead, moment ' +
                'FROM message WHERE userId = ? ORDER BY id DESC LIMIT ? OFFSET ?', [uid, pagesize, offset]
            )

            // 总条数
            const [
                [{ c }]
            ] = await pool.query('SELECT COUNT(1) AS c FROM message WHERE userId = ?', [uid])

            // 未读数（单独 count，避免遍历 list 不准确）
            const [
                [{ unread }]
            ] = await pool.query(
                'SELECT COUNT(1) AS unread FROM message WHERE userId = ? AND isRead = 0', [uid]
            )

            // id、wallId、commentId、type、isRead 可能是 BigInt，统一转 Number
            const listSafe = list.map(item => ({
                ...item,
                id: Number(item.id),
                type: Number(item.type),
                wallId: item.wallId === null ? null : Number(item.wallId),
                commentId: item.commentId === null ? null : Number(item.commentId),
                isRead: Number(item.isRead)
            }))

            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    list: listSafe,
                    total: Number(c),
                    page,
                    pagesize,
                    unread: Number(unread)
                }
            })
        } catch (err) {
            console.error('查我的消息异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 接口2：查未读数
    app.get('/api/user/messages/unread', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            const uid = String(req.user.id)
            const [
                [{ unread }]
            ] = await pool.query(
                'SELECT COUNT(1) AS unread FROM message WHERE userId = ? AND isRead = 0', [uid]
            )

            res.json({
                code: 200,
                msg: 'ok',
                data: { unread: Number(unread) }
            })
        } catch (err) {
            console.error('查未读数异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 接口3：标记已读
    app.put('/api/user/message/:id/read', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            // 路径参数 id：字符串转 Number，必须是正整数
            const id = Number(req.params.id)
            if (!Number.isInteger(id) || id < 1) {
                return res.json({ code: 400, msg: '非法id', data: null })
            }

            // 校验消息存在且属于当前用户（一次查询同时判断存在 + 归属）
            const [rows] = await pool.query(
                'SELECT id FROM message WHERE id = ? AND userId = ? LIMIT 1', [id, String(req.user.id)]
            )
            if (rows.length === 0) {
                return res.json({ code: 400, msg: '该消息不存在', data: null })
            }

            // 标记已读
            await pool.query('UPDATE message SET isRead = 1 WHERE id = ?', [id])

            res.json({ code: 200, msg: '已读', data: null })
        } catch (err) {
            console.error('标记已读异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // ==================== 个人空间接口 ====================

    // 当前用户信息
    app.get('/api/user/info', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            // 显式字段，不返回 password
            const [rows] = await pool.query(
                'SELECT id, username, imgurl, role FROM user WHERE id = ? LIMIT 1', [req.user.id]
            )
            if (rows.length === 0) {
                return res.json({ code: 400, msg: '用户不存在', data: null })
            }

            const u = rows[0]
            res.json({
                code: 200,
                msg: 'ok',
                data: {
                    id: Number(u.id),
                    username: u.username,
                    imgurl: u.imgurl,
                    role: Number(u.role)
                }
            })
        } catch (err) {
            console.error('查用户信息异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 我的留言（分页）
    app.get('/api/user/walls', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // walls.userId 是 VARCHAR(50)，登录用户存数字 id 字符串
            const uid = String(req.user.id)

            const [list] = await pool.query(
                'SELECT id, type, message, userId, moment, label, color, imgurl AS img ' +
                'FROM walls WHERE userId = ? ORDER BY id DESC LIMIT ? OFFSET ?', [uid, pagesize, offset]
            )
            const [
                [{ c }]
            ] = await pool.query('SELECT COUNT(1) AS c FROM walls WHERE userId = ?', [uid])

            // id、type 可能是 BigInt，统一转 Number
            const listSafe = list.map(item => ({
                ...item,
                id: Number(item.id),
                type: Number(item.type)
            }))

            res.json({
                code: 200,
                msg: 'ok',
                data: { list: listSafe, total: Number(c), page, pagesize }
            })
        } catch (err) {
            console.error('查我的留言异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 修改头像（imgurl 为上传后的图片路径 /photo/xxx.jpg）
    app.put('/api/user/avatar', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            // imgurl：字符串、非空、长度限制 255，防止脏数据
            const imgurl = String(req.body && req.body.imgurl || '').trim()
            if (!imgurl || imgurl.length > 255) {
                return res.json({ code: 400, msg: '非法头像地址', data: null })
            }

            await pool.query('UPDATE user SET imgurl = ? WHERE id = ?', [imgurl, req.user.id])

            res.json({ code: 200, msg: 'ok', data: { imgurl } })
        } catch (err) {
            console.error('修改头像异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 修改密码（先校验原密码，再更新为新密码）
    app.put('/api/user/password', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            // 原密码、新密码 trim 后都不能为空
            const oldPassword = String((req.body && req.body.oldPassword) || '').trim()
            const newPassword = String((req.body && req.body.newPassword) || '').trim()
            if (!oldPassword || !newPassword) {
                return res.json({ code: 400, msg: '原密码和新密码不能为空', data: null })
            }
            // 与注册保持一致：新密码 6~20 位
            if (newPassword.length < 6 || newPassword.length > 20) {
                return res.json({ code: 400, msg: '新密码长度需为 6~20 个字符', data: null })
            }
            if (newPassword === oldPassword) {
                return res.json({ code: 400, msg: '新密码不能与原密码相同', data: null })
            }

            // 取当前密码做比对
            const [rows] = await pool.query('SELECT password FROM user WHERE id = ? LIMIT 1', [req.user.id])
            if (rows.length === 0) {
                return res.json({ code: 400, msg: '用户不存在', data: null })
            }
            // 演示用明文比对，实际项目应使用 bcrypt.compare
            if (rows[0].password !== oldPassword) {
                return res.json({ code: 400, msg: '原密码不正确', data: null })
            }

            await pool.query('UPDATE user SET password = ? WHERE id = ?', [newPassword, req.user.id])

            res.json({ code: 200, msg: '密码修改成功', data: null })
        } catch (err) {
            console.error('修改密码异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })

    // 我的评论（分页）
    app.get('/api/user/comments', tokenVerify, async(req, res) => {
        try {
            if (!req.user) {
                return res.json({ code: 401, msg: '请先登录', data: null })
            }

            let page = parseInt(req.query.page) || 1
            let pagesize = parseInt(req.query.pagesize) || 10
            page = page < 1 ? 1 : page
            pagesize = pagesize < 1 ? 10 : pagesize
            const offset = (page - 1) * pagesize

            // comments.userId 是 VARCHAR(60)，登录用户存数字 id 字符串
            const uid = String(req.user.id)

            // 评论内容列名是 comment 不是 content
            const [list] = await pool.query(
                'SELECT id, wallId, userId, imgurl, comment, name, moment, parentId ' +
                'FROM comments WHERE userId = ? ORDER BY id DESC LIMIT ? OFFSET ?', [uid, pagesize, offset]
            )
            const [
                [{ c }]
            ] = await pool.query('SELECT COUNT(1) AS c FROM comments WHERE userId = ?', [uid])

            const listSafe = list.map(item => ({
                ...item,
                id: Number(item.id),
                wallId: item.wallId === null ? null : Number(item.wallId),
                parentId: item.parentId === null ? null : Number(item.parentId)
            }))

            res.json({
                code: 200,
                msg: 'ok',
                data: { list: listSafe, total: Number(c), page, pagesize }
            })
        } catch (err) {
            console.error('查我的评论异常：', err)
            res.json({ code: 500, msg: '服务器异常', data: null })
        }
    })
}