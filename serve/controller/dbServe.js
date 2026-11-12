const dbModel = require('../lib/db')
const { pool } = require('../lib/db')

//新建walls
exports.insertWall = async(req, res) => {
    try {
        let data = req.body;
        // console.log(data);

        // 数组顺序： type, message, userId, moment, label, color, imgurl, name
        // name：前端填了签名就存签名，没填存空串
        const result = await dbModel.insertWall([
            data.type,
            data.message,
            data.userId,
            data.moment,
            data.label,
            data.color,
            data.imgurl,
            data.name || ''
        ])
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "发布留言失败" })
    }
}

//新建反馈（点赞举报）：type=0点赞时给卡片主人写一条 type=1 消息通知
exports.insertFeedback = async(req, res) => {
    try {
        let data = req.body;

        // 撤销点赞（type=2）：删除该用户在该留言的点赞记录（type=0）
        if (Number(data.type) === 2) {
            await pool.query('DELETE FROM feedbacks WHERE wallId = ? AND userId = ? AND type = 0', [data.wallId, data.userId])
            return res.send({ code: 200, message: '已撤销点赞' })
        }

        const result = await dbModel.insertFeedback([data.wallId, data.userId, data.type, data.moment])

        // 仅点赞（type=0）写消息通知
        if (Number(data.type) === 0) {
            try {
                // 查卡片主人 userId
                const [walls] = await pool.query('SELECT userId FROM walls WHERE id = ? LIMIT 1', [data.wallId])
                if (walls.length > 0) {
                    const cardOwnerId = walls[0].userId
                    // 不给自己写消息
                    if (String(cardOwnerId) !== String(data.userId)) {
                        // fromName：登录用户查 username
                        let fromName = '游客'
                        if (/^\d+$/.test(String(data.userId))) {
                            const [users] = await pool.query('SELECT username FROM user WHERE id = ? LIMIT 1', [data.userId])
                            if (users.length > 0) fromName = users[0].username
                        }
                        await pool.query(
                            'INSERT INTO message (userId, type, wallId, fromUserId, fromName, content, isRead, moment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [cardOwnerId, 1, data.wallId, data.userId, fromName, '赞了你的留言', 0, data.moment]
                        )
                    }
                }
            } catch (msgErr) {
                console.error('写点赞消息异常：', msgErr)
            }
        }

        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "新增反馈失败" })
    }
}

//新建评论：参数 [wallId, userId, imgurl, comment, moment, name, parentId]
//直接评论（parentId为空）成功后给卡片主人写一条 type=2 消息通知
exports.insertComment = async(req, res) => {
    try {
        let data = req.body;
        const result = await dbModel.insertComment([
            data.wallId,
            data.userId,
            data.imgurl,
            data.comment,
            data.moment,
            data.name || '',
            data.parentId || null
        ])
        const commentId = result.insertId

        // 仅直接评论卡片（parentId 为空）写消息通知，回复走 /api/reply
        if (!data.parentId) {
            try {
                // 查卡片主人 userId
                const [walls] = await pool.query('SELECT userId FROM walls WHERE id = ? LIMIT 1', [data.wallId])
                if (walls.length > 0) {
                    const cardOwnerId = walls[0].userId
                    // 不给自己写消息
                    if (String(cardOwnerId) !== String(data.userId)) {
                        const fromName = data.name || '匿名'
                        const content = String(data.comment || '').slice(0, 50)
                        await pool.query(
                            'INSERT INTO message (userId, type, wallId, commentId, fromUserId, fromName, content, isRead, moment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [cardOwnerId, 2, data.wallId, commentId, data.userId, fromName, content, 0, data.moment]
                        )
                    }
                }
            } catch (msgErr) {
                console.error('写评论消息异常：', msgErr)
            }
        }

        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "新增评论失败" })
    }
}

//删除墙，主表对应多条子表一起删除
exports.deleteWall = async(req, res) => {
    try {
        let data = req.body;
        const result = await dbModel.deleteWall(data.id)
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "删除留言失败" })
    }
}

//删除反馈 修复拼写 dalete → delete
exports.deleteFeedback = async(req, res) => {
    try {
        let data = req.body;
        const result = await dbModel.deleteFeedback(data.id)
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "删除反馈失败" })
    }
}

//删除评论
exports.deleteComment = async(req, res) => {
    try {
        let data = req.body;
        const result = await dbModel.deleteComment(data.id)
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "删除评论失败" })
    }
}

//分页查询wall并获取赞、举报、撤销数据
exports.findWallPage = async(req, res) => {
    try {
        let data = req.body
        const result = await dbModel.findWallPage(data.page, data.pagesize, data.type, data.label)
        for (let i = 0; i < result.length; i++) {
            //查找相应wall的赞、举报、撤销数据
            //likeCount返回 {count:xx}，要取.count
            result[i].like = (await dbModel.feedbackCount(result[i].id, 0)).count;
            result[i].report = (await dbModel.feedbackCount(result[i].id, 1)).count;
            result[i].revoke = (await dbModel.feedbackCount(result[i].id, 2)).count;
            //是否点赞
            result[i].islike = (await dbModel.likeCount(result[i].id, data.userId)).count;
            //评论数
            result[i].comcount = (await dbModel.commentCount(result[i].id)).count;
        }
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "获取留言分页失败" })
    }
}

//查询标签列表，body可传type（0留言墙 1照片墙），不传返回全部
exports.findLabel = async(req, res) => {
    try {
        let data = req.body || {}
        const result = await dbModel.findLabel(data.type)
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "获取标签失败" })
    }
}

//倒叙分页查墙的评论
exports.findCommentPage = async(req, res) => {
    try {
        let data = req.body
        const result = await dbModel.findCommentPage(data.page, data.pagesize, data.id)
        res.send({
            code: 200,
            message: result,
        })
    } catch (err) {
        console.error(err)
        res.send({ code: 500, message: "获取评论分页失败" })
    }
}