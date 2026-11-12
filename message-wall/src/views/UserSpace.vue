<template>
    <div class="user-space">
        <!-- 顶部用户信息条 -->
        <div class="user-header" v-if="info">
            <!-- 头像：悬停出"+"遮罩，点击上传图片 -->
            <div class="avatar-wrap" title="点击更换头像">
                <div class="avatar" :style="{ backgroundImage: portraitBg(info.imgurl) }"></div>
                <div class="avatar-mask" @click="avatarInput && avatarInput.click()">+</div>
                <input
                    ref="avatarInput"
                    type="file"
                    accept="image/*"
                    class="avatar-file"
                    @change="onAvatarFile"
                />
            </div>
            <div class="meta">
                <p class="username">{{ info.username }}</p>
                <p class="uid">ID：{{ info.id }}</p>
            </div>
            <el-button class="back-btn" @click="$router.push('/')">返回留言墙</el-button>
        </div>

        <el-tabs v-model="activeTab" class="space-tabs" @tab-change="onTabChange">
            <!-- tab1 我的留言 -->
            <el-tab-pane label="我的留言" name="walls">
                <template v-if="walls.list.length">
                    <div class="wall-list">
                        <div class="wall-item" v-for="w in walls.list" :key="w.id" @click="goWall(w.id)">
                            <p class="wall-msg">{{ w.message }}</p>
                            <div class="wall-foot">
                                <el-tag size="small" :type="w.type === 1 ? 'warning' : 'primary'">
                                    {{ w.type === 1 ? '照片墙' : '留言墙' }}
                                </el-tag>
                                <span class="time">{{ formatTime(w.moment) }}</span>
                                <!-- 阻止冒泡：点删除不进入详情 -->
                                <el-button link type="danger" class="del-btn" @click.stop="removeWall(w)">删除</el-button>
                            </div>
                        </div>
                    </div>
                    <el-pagination
                        layout="prev, pager, next, total"
                        :total="walls.total"
                        :page-size="walls.pagesize"
                        :current-page="walls.page"
                        @current-change="p => loadWalls(p)"
                    />
                </template>
                <el-empty v-else description="暂无留言" />
            </el-tab-pane>

            <!-- tab2 我的评论 -->
            <el-tab-pane label="我的评论" name="comments">
                <template v-if="comments.list.length">
                    <div class="cmt-list">
                        <div class="cmt-item" v-for="c in comments.list" :key="c.id" @click="goWall(c.wallId)">
                            <p class="cmt-text">{{ c.comment }}</p>
                            <div class="cmt-foot">
                                <el-tag v-if="c.parentId" size="small" type="info">回复</el-tag>
                                <span class="time">{{ formatTime(c.moment) }}</span>
                            </div>
                        </div>
                    </div>
                    <el-pagination
                        layout="prev, pager, next, total"
                        :total="comments.total"
                        :page-size="comments.pagesize"
                        :current-page="comments.page"
                        @current-change="p => loadComments(p)"
                    />
                </template>
                <el-empty v-else description="暂无评论" />
            </el-tab-pane>

            <!-- tab3 个人资料 -->
            <el-tab-pane label="个人资料" name="profile">
                <el-descriptions v-if="info" :column="1" border class="profile-desc">
                    <el-descriptions-item label="用户ID">{{ info.id }}</el-descriptions-item>
                    <el-descriptions-item label="用户名">{{ info.username }}</el-descriptions-item>
                    <el-descriptions-item label="角色">{{ info.role === 1 ? '管理员' : '普通用户' }}</el-descriptions-item>
                </el-descriptions>

                <!-- 修改密码 -->
                <p class="pwd-title">修改密码</p>
                <el-form
                    ref="pwdFormRef"
                    :model="pwdForm"
                    :rules="pwdRules"
                    label-width="90px"
                    class="pwd-form"
                >
                    <el-form-item label="原密码" prop="oldPassword">
                        <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
                    </el-form-item>
                    <el-form-item label="新密码" prop="newPassword">
                        <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="6~20 个字符" />
                    </el-form-item>
                    <el-form-item label="确认新密码" prop="confirmPassword">
                        <el-input
                            v-model="pwdForm.confirmPassword"
                            type="password"
                            show-password
                            placeholder="请再次输入新密码"
                            @keyup.enter="handleChangePassword"
                        />
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" :loading="pwdLoading" @click="handleChangePassword">
                            保存修改
                        </el-button>
                    </el-form-item>
                </el-form>

                <el-button type="danger" plain @click="logout">退出登录</el-button>
            </el-tab-pane>

            <!-- tab4 消息（标题带未读红点） -->
            <el-tab-pane name="messages">
                <template #label>
                    <el-badge :value="unread" :hidden="unread === 0" :max="99">消息</el-badge>
                </template>
                <template v-if="messages.list.length">
                    <div class="msg-list">
                        <div
                            class="msg-item"
                            v-for="m in messages.list"
                            :key="m.id"
                            :class="{ unread: m.isRead === 0 }"
                            @click="onMessageClick(m)"
                        >
                            <span class="dot" v-if="m.isRead === 0"></span>
                            <div class="msg-body">
                                <p class="msg-text">{{ msgText(m) }}</p>
                            </div>
                            <span class="msg-time">{{ formatTime(m.moment) }}</span>
                        </div>
                    </div>
                    <el-pagination
                        layout="prev, pager, next, total"
                        :total="messages.total"
                        :page-size="messages.pagesize"
                        :current-page="messages.page"
                        @current-change="p => loadMessages(p)"
                    />
                </template>
                <el-empty v-else description="暂无消息" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    getUserInfoApi,
    getUserWallsApi,
    deleteMyWallApi,
    getUserCommentsApi,
    getUserMessagesApi,
    getUnreadCountApi,
    readMessageApi,
    updateAvatarApi,
    updatePasswordApi,
    profileApi,
    signIpApi
} from '@/api/index.js'
import { portrait } from '@/utils/data.js'
import { refreshUserState } from '@/utils/auth.js'
import { dateOne } from '@/utils/yksg.js'

const router = useRouter()
const store = useStore()

// 用户信息
const info = ref(null)
// 未读消息数（tab 标题红点）
const unread = ref(0)
const activeTab = ref('walls')

// 三个分页数据源
const walls    = reactive({ list: [], total: 0, page: 1, pagesize: 10 })
const comments = reactive({ list: [], total: 0, page: 1, pagesize: 10 })
const messages = reactive({ list: [], total: 0, page: 1, pagesize: 10 })

// 头像背景：/photo/ 开头拼后端域名；数字序号走渐变；兜底透明（由"+"遮罩覆盖）
const portraitBg = img => {
    const s = String(img || '')
    if (s.startsWith('/photo/')) return `url(http://localhost:3000${s})`
    if (s && portrait[s]) return portrait[s]
    return 'none'
}

// 时间格式化（dateOne 是项目已有工具）
const formatTime = t => dateOne(t)

// 消息文案
const msgText = m => {
    if (m.type === 1) return `${m.fromName} 赞了你的留言`
    if (m.type === 2) return `${m.fromName} 评论了你的留言：${m.content}`
    if (m.type === 3) return `${m.fromName} 回复了你：${m.content}`
    return m.content || ''
}

// 加载数据
const loadInfo = async () => {
    const res = await getUserInfoApi()
    if (res.code === 200) info.value = res.data
}
const loadWalls = async (page = 1) => {
    const res = await getUserWallsApi({ page, pagesize: walls.pagesize })
    if (res.code === 200) Object.assign(walls, res.data)
}
const loadComments = async (page = 1) => {
    const res = await getUserCommentsApi({ page, pagesize: comments.pagesize })
    if (res.code === 200) Object.assign(comments, res.data)
}
const loadMessages = async (page = 1) => {
    const res = await getUserMessagesApi({ page, pagesize: messages.pagesize })
    if (res.code === 200) {
        Object.assign(messages, res.data)
        unread.value = res.data.unread
    }
}
const loadUnread = async () => {
    const res = await getUnreadCountApi()
    if (res.code === 200) unread.value = res.data.unread
}

// 删除本人的留言：二次确认 → 调接口 → 刷新列表（删完当前页则回退一页）
const removeWall = async w => {
    try {
        await ElMessageBox.confirm(
            '删除后该留言及其评论、点赞记录将一并清除，是否继续？',
            '删除留言',
            { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
        )
    } catch (e) {
        return // 用户取消
    }
    let res
    try {
        res = await deleteMyWallApi(w.id)
    } catch (err) {
        ElMessage.error('删除失败，请检查网络或后端服务')
        return
    }
    if (res.code === 200) {
        ElMessage.success('已删除')
        const nextPage = walls.list.length === 1 && walls.page > 1 ? walls.page - 1 : walls.page
        loadWalls(nextPage)
    } else {
        ElMessage.error(res.msg || '删除失败')
    }
}

// 切换 tab 时按需加载（避免一次性全查）
const loaded = { walls: false, comments: false, messages: false }
const onTabChange = name => {
    if (name === 'walls' && !loaded.walls)       { loaded.walls = true; loadWalls() }
    if (name === 'comments' && !loaded.comments) { loaded.comments = true; loadComments() }
    if (name === 'messages' && !loaded.messages) { loaded.messages = true; loadMessages() }
}

// 点击消息：先标记已读（失败也继续跳转），再跳对应卡片所在墙
const onMessageClick = async m => {
    if (m.isRead === 0) {
        try {
            await readMessageApi(m.id)
            m.isRead = 1
            unread.value = Math.max(0, unread.value - 1)
        } catch (e) { /* 标记失败不影响跳转 */ }
    }
    goWall(m.wallId)
}

// 更换头像：上传图片 → /photo/xxx → 存库 → 同步 info + localStorage，TopBar 即时刷新
const avatarInput = ref(null)
const onAvatarFile = async e => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // 允许重复选同一张图
    if (!file) return
    if (!file.type.startsWith('image/')) {
        ElMessage.error('请选择图片文件')
        return
    }
    // 1. 上传图片文件（/profile 直接返回字符串路径 "/photo/xxx.png"）
    const fd = new FormData()
    fd.append('file', file)
    const up = await profileApi(fd)
    if (typeof up !== 'string' || !up.startsWith('/photo/')) {
        ElMessage.error('上传失败')
        return
    }
    // 2. 把图片路径存到用户头像
    const res = await updateAvatarApi({ imgurl: up })
    if (res.code !== 200) {
        ElMessage.error(res.msg || '头像保存失败')
        return
    }
    // 3. 同步本地状态
    info.value.imgurl = res.data.imgurl
    try {
        const u = JSON.parse(localStorage.getItem('userInfo') || '{}')
        u.imgurl = res.data.imgurl
        localStorage.setItem('userInfo', JSON.stringify(u))
    } catch (err) { /* 忽略解析失败 */ }
    refreshUserState()
    ElMessage.success('头像已更新')
}

// 修改密码：三条校验与注册保持一致
const pwdFormRef = ref(null)
const pwdLoading = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const pwdRules = {
    oldPassword: [
        {
            validator: (r, v, cb) => {
                if (!String(v || '').trim()) return cb(new Error('请输入原密码'))
                cb()
            },
            trigger: 'blur'
        }
    ],
    newPassword: [
        {
            validator: (r, v, cb) => {
                const val = String(v || '').trim()
                if (!val) return cb(new Error('请输入新密码'))
                if (val.length < 6 || val.length > 20) return cb(new Error('新密码长度需为 6~20 个字符'))
                cb()
            },
            trigger: 'blur'
        }
    ],
    confirmPassword: [
        {
            validator: (r, v, cb) => {
                const val = String(v || '').trim()
                if (!val) return cb(new Error('请再次输入新密码'))
                cb(val === String(pwdForm.newPassword || '').trim() ? undefined : new Error('两次密码不一致'))
            },
            trigger: 'blur'
        }
    ]
}

const handleChangePassword = async () => {
    if (!pwdFormRef.value) return
    try {
        await pwdFormRef.value.validate()
    } catch {
        return // 校验失败静默
    }
    pwdLoading.value = true
    try {
        const res = await updatePasswordApi({
            oldPassword: pwdForm.oldPassword.trim(),
            newPassword: pwdForm.newPassword.trim()
        })
        if (res.code !== 200) {
            ElMessage.error(res.msg || '修改失败')
            return
        }
        ElMessage.success(res.msg || '密码修改成功')
        // 清空表单，避免密码残留在页面上
        pwdForm.oldPassword = pwdForm.newPassword = pwdForm.confirmPassword = ''
        pwdFormRef.value.clearValidate()
    } catch (err) {
        ElMessage.error('网络异常，请稍后重试')
    } finally {
        pwdLoading.value = false
    }
}

// 跳卡片所在页：留言墙 /wall?id=0，照片墙 /wall?id=1
// 消息里没存卡片 type，统一跳留言墙首页（有 wallId 时带上便于定位）
const goWall = wallId => {
    if (wallId) router.push({ path: '/wall', query: { id: 0, wallId } })
    else router.push('/')
}

// 退出登录
const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    // 退出后身份还原为游客：重新取 IP 写回 Vuex
    signIpApi().then(res => {
        store.commit('getUser', { id: res.ip })
    }).catch(() => {
        store.commit('getUser', { id: '' })
    })
    ElMessage.success('已退出登录')
    router.push('/login')
}

onMounted(() => {
    loadInfo()
    loaded.walls = true
    loadWalls()
    loadUnread() // 进页面就先拿未读数，让红点立即可见
})
</script>

<style lang="less" scoped>
.user-space {
    max-width: 720px;
    margin: 0 auto;
    padding: 80px 20px 40px;

    .user-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        margin-bottom: 20px;

        .avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background-size: cover;
            background-position: center;
            flex: none;
        }
        .meta {
            flex: 1;
            .username { font-size: 18px; font-weight: 600; }
            .uid { font-size: 12px; color: #999; margin-top: 4px; }
        }
    }

    .space-tabs {
        background: #fff;
        border-radius: 12px;
        padding: 12px 20px 20px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

        :deep(.el-pagination) {
            margin-top: 16px;
            justify-content: center;
        }
    }

    // 留言 / 评论项
    .wall-item, .cmt-item {
        padding: 14px 4px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        &:hover { background: #fafafa; }
        .wall-msg, .cmt-text {
            font-size: 14px;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .wall-foot, .cmt-foot {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 8px;
            .time { font-size: 12px; color: #999; }
            // 删除按钮靠右，不影响标签与时间布局
            .del-btn { margin-left: auto; font-size: 12px; }
        }
    }

    // 消息列表
    .msg-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 4px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        &:hover { background: #fafafa; }

        .dot {
            flex: none;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #f56c6c;
        }
        .msg-body {
            flex: 1;
            min-width: 0;
            .msg-text {
                font-size: 14px;
                color: #666;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }
        &.unread .msg-text { color: #333; font-weight: 600; }
        .msg-time { flex: none; font-size: 12px; color: #999; }
    }

    .profile-desc { margin-bottom: 20px; }

    // 修改密码
    .pwd-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin: 4px 0 16px;
    }
    .pwd-form {
        max-width: 360px;
        margin-bottom: 16px;
    }

    // 头像上传：悬停出"+"遮罩，input 隐藏
    .avatar-wrap {
        position: relative;
        flex: none;
        width: 56px;
        height: 56px;
        .avatar-mask {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.45);
            color: #fff;
            font-size: 26px;
            line-height: 1;
            cursor: pointer;
        }
        .avatar-file {
            display: none;
        }
    }
}
</style>
