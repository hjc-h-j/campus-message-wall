const mysql = require('mysql2/promise')
const config = require('../config/default')

const pool = mysql.createPool({
    host: config.database.HOST,
    port: config.database.PORT,
    user: config.database.USER,
    password: config.database.PASSWORD,
    database: config.database.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

/**
 * 新增留言 walls
 * @param {Array} value [type, message, userId, moment, label, color, imgurl, name] 共8个参数
 * name: 发布者签名快照（前端填了签名就存签名，没填存空串，查询时CASE判断）
 */
async function insertWall(value) {
    const sql = `INSERT INTO walls 
    SET type=?, message=?, userId=?, moment=?, label=?, color=?, imgurl=?, name=?`
    const [res] = await pool.query(sql, value)
    return res
}

/**
 * 新建反馈(点赞/举报/撤销)
 * value数组： [wallId, userId, type, moment]
 */
async function insertFeedback(value) {
    const _sql = "INSERT INTO feedbacks SET wallId=?, userId=?, type=?, moment=?"
    const [res] = await pool.query(_sql, value)
    return res
}

/**
 * 新建评论
 * value数组： [wallId, userId, imgurl, comment, moment, name, parentId]
 * name: 游客填写的签名；parentId: NULL为直接评论卡片，非NULL为回复某条评论
 */
async function insertComment(value) {
    const _sql = "INSERT INTO comments SET wallId=?, userId=?, imgurl=?, comment=?, moment=?, name=?, parentId=?"
    const [res] = await pool.query(_sql, value)
    return res
}

/**
 * 删除留言，同时删除关联反馈、评论
 * @param {Number} wallId 留言id
 */
async function deleteWall(wallId) {
    await pool.query("DELETE FROM feedbacks WHERE wallId = ?", [wallId])
    await pool.query("DELETE FROM comments WHERE wallId = ?", [wallId])
    const [res] = await pool.query("DELETE FROM walls WHERE id = ?", [wallId])
    return res
}

/**
 * 删除单条反馈
 */
async function deleteFeedback(id) {
    const _sql = "DELETE FROM feedbacks WHERE id = ?"
    const [res] = await pool.query(_sql, [id])
    return res
}

/**
 * 删除单条评论
 */
async function deleteComment(id) {
    const _sql = "DELETE FROM comments WHERE id = ?"
    const [res] = await pool.query(_sql, [id])
    return res
}

/**
 * 分页查询留言列表，LEFT JOIN user 获取username别名name返回前端
 * @param {number} page 页码
 * @param {number} pagesize 每页条数
 * @param {number} type 留言类型
 * @param {number} label 标签id，-1代表全部
 */
async function findWallPage(page, pagesize, type, label) {
    const offset = (page - 1) * pagesize
    let _sql
    let params = [type]
    if (label == -1) {
        _sql = `
            SELECT walls.*, 
                   CASE WHEN walls.name IS NOT NULL AND walls.name != '' 
                        THEN walls.name 
                        ELSE COALESCE(user.username, '匿名') 
                   END AS name
            FROM walls
            LEFT JOIN user ON walls.userId = user.id
            WHERE walls.type = ?
            ORDER BY walls.id DESC
            LIMIT ?, ?
        `
        params.push(offset, pagesize)
    } else {
        _sql = `
            SELECT walls.*, 
                   CASE WHEN walls.name IS NOT NULL AND walls.name != '' 
                        THEN walls.name 
                        ELSE COALESCE(user.username, '匿名') 
                   END AS name
            FROM walls
            LEFT JOIN user ON walls.userId = user.id
            WHERE walls.type = ? AND walls.label = ?
            ORDER BY walls.id DESC
            LIMIT ?, ?
        `
        params.push(label, offset, pagesize)
    }
    const [rows] = await pool.query(_sql, params)
    return rows
}

/**
 * 分页查询某留言下评论，联user拿name
 * @param {number} page
 * @param {number} pagesize
 * @param {number} wallId 留言id
 */
async function findCommentPage(page, pagesize, wallId) {
    const offset = (page - 1) * pagesize
    // 先查顶层评论（parentId IS NULL）做分页，再用 CTE 把每个顶层的完整子孙链一次性拉回来
    const _sql = `
        WITH RECURSIVE
        top AS (
            SELECT id FROM comments
            WHERE wallId = ? AND (parentId IS NULL OR parentId = 0)
            ORDER BY id DESC
            LIMIT ?, ?
        ),
        descendants AS (
            SELECT id, parentId, comment, wallId, userId, imgurl, moment, name
            FROM comments WHERE parentId IN (SELECT id FROM top)
            UNION ALL
            SELECT c.id, c.parentId, c.comment, c.wallId, c.userId, c.imgurl, c.moment, c.name
            FROM comments c
            INNER JOIN descendants d ON d.id = c.parentId
        )
        SELECT comments.id, comments.parentId, comments.comment, comments.wallId,
               comments.userId, comments.imgurl, comments.moment,
               CASE WHEN comments.name IS NOT NULL AND comments.name != ''
                    THEN comments.name
                    ELSE COALESCE(user.username, '匿名')
               END AS name
        FROM comments
        LEFT JOIN user ON comments.userId = user.id
        WHERE comments.id IN (SELECT id FROM top)
           OR comments.id IN (SELECT id FROM descendants)
        ORDER BY comments.id DESC
    `
    const [rows] = await pool.query(_sql, [wallId, offset, pagesize])
    return rows
}

/**
 * 查询反馈数量（点赞/举报统计）
 * wid：留言id，type：0点赞 1举报
 */
async function feedbackCount(wid, type) {
    const _sql = `SELECT COUNT(*) AS count FROM feedbacks WHERE wallId = ? AND type = ?`
    const [rows] = await pool.query(_sql, [wid, type])
    return rows[0]
}

/**
 * 查询评论总数
 */
async function commentCount(wid) {
    const _sql = `SELECT COUNT(*) AS count FROM comments WHERE wallId = ?`
    const [rows] = await pool.query(_sql, [wid])
    return rows[0]
}

/**
 * 判断用户是否已经点赞
 */
async function likeCount(wid, uid) {
    const _sql = `SELECT COUNT(*) AS count FROM feedbacks WHERE wallId = ? AND userId = ? AND type = 0`
    const [rows] = await pool.query(_sql, [wid, uid])
    return rows[0]
}

/**
 * 查询标签列表
 * @param {number|null} type 0第一组(留言墙) 1第二组(照片墙)，不传则返回全部
 */
async function findLabel(type) {
    let _sql = `SELECT id, label_name, type FROM label`
    let params = []
    if (type === 0 || type === 1) {
        _sql += ` WHERE type = ?`
        params.push(type)
    }
    _sql += ` ORDER BY id ASC`
    const [rows] = await pool.query(_sql, params)
    return rows
}

// 测试连接函数
async function testDbConnect() {
    try {
        const conn = await pool.getConnection()
        console.log('数据库连接成功')
        conn.release()
    } catch (err) {
        console.error('数据库连接失败：', err.message)
    }
}

module.exports = {
    pool,
    testDbConnect,
    insertWall,
    insertFeedback,
    insertComment,
    deleteWall,
    deleteFeedback,
    deleteComment,
    findWallPage,
    findCommentPage,
    findLabel,
    feedbackCount,
    commentCount,
    likeCount
}