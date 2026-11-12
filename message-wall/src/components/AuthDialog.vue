<template>
    <el-dialog
        v-model="visible"
        custom-class="auth-dialog"
        :show-close="true"
        :close-on-click-modal="true"
        :close-on-press-escape="true"
        :append-to-body="true"
        width="380px"
    >
        <el-tabs v-model="activeTab" stretch>
            <!-- 登录 -->
            <el-tab-pane label="登录" name="login">
                <el-form ref="loginFormRef" :model="loginForm" :rules="rules" @submit.prevent>
                    <el-form-item prop="username">
                        <el-input v-model="loginForm.username" placeholder="用户名" clearable />
                    </el-form-item>
                    <el-form-item prop="password">
                        <el-input
                            v-model="loginForm.password"
                            type="password"
                            placeholder="密码"
                            show-password
                            @keyup.enter="handleLogin"
                        />
                    </el-form-item>
                    <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
                        登录
                    </el-button>
                </el-form>
            </el-tab-pane>

            <!-- 注册 -->
            <el-tab-pane label="注册" name="register">
                <el-form ref="regFormRef" :model="regForm" :rules="regRules" @submit.prevent>
                    <el-form-item prop="username">
                        <el-input v-model="regForm.username" placeholder="用户名" clearable />
                    </el-form-item>
                    <el-form-item prop="password">
                        <el-input v-model="regForm.password" type="password" placeholder="密码" show-password />
                    </el-form-item>
                    <el-form-item prop="confirm">
                        <el-input
                            v-model="regForm.confirm"
                            type="password"
                            placeholder="确认密码"
                            show-password
                            @keyup.enter="handleRegister"
                        />
                    </el-form-item>
                    <el-button type="primary" class="submit-btn" :loading="loading" @click="handleRegister">
                        注册
                    </el-button>
                </el-form>
            </el-tab-pane>
        </el-tabs>
    </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loginApi, registerApi } from '@/api/index.js'
import { authState, closeAuthDialog, refreshUserState } from '@/utils/auth.js'
import { useStore } from 'vuex'

const router = useRouter()
const store = useStore()

// 弹窗显隐双向绑定到全局状态
const visible = computed({
    get: () => authState.showDialog,
    set: v => { authState.showDialog = v }
})

const activeTab = ref('login')
const loading = ref(false)

// ---------- 登录 ----------
const loginFormRef = ref(null)
const loginForm = reactive({ username: '', password: '' })
const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
    try {
        await loginFormRef.value.validate()
    } catch {
        return // 校验失败静默
    }
    loading.value = true
    try {
        const res = await loginApi({ username: loginForm.username, password: loginForm.password })
        if (res.code !== 200) {
            ElMessage.error(res.msg || '登录失败')
            return
        }
        // 存 token + userInfo，刷新全局用户状态，关弹窗
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('userInfo', JSON.stringify(res.data.userInfo))
        // 登录存id：把 Vuex 里的身份标识从游客 IP 切换为数据库 id
        store.commit('getUser', { id: String(res.data.userInfo.id) })
        refreshUserState()
        closeAuthDialog()
        ElMessage.success(res.msg || '登录成功')
        // 管理员跳后台，普通用户留在当前页
        if (Number(res.data.userInfo.role) === 1) {
            router.push('/admin/index')
        }
    } catch (err) {
        ElMessage.error('网络异常，请稍后重试')
    } finally {
        loading.value = false
    }
}

// ---------- 注册 ----------
const regFormRef = ref(null)
const regForm = reactive({ username: '', password: '', confirm: '' })
const regUsernameValidator = (r, v, cb) => {
    const val = String(v || '').trim()
    if (!val) return cb(new Error('请输入用户名'))
    if (val.length < 3 || val.length > 20) return cb(new Error('用户名长度需为 3~20 个字符'))
    if (!/^\w+$/.test(val)) return cb(new Error('用户名只能包含字母、数字和下划线'))
    cb()
}
// 密码：trim 后必填，6~20 位
const regPasswordValidator = (r, v, cb) => {
    const val = String(v || '').trim()
    if (!val) return cb(new Error('请输入密码'))
    if (val.length < 6 || val.length > 20) return cb(new Error('密码长度需为 6~20 个字符'))
    cb()
}
const regRules = {
    username: [{ required: true, validator: regUsernameValidator, trigger: 'blur' }],
    password: [{ required: true, validator: regPasswordValidator, trigger: 'blur' }],
    confirm: [
        { required: true, message: '请再次输入密码', trigger: 'blur' },
        {
            validator: (r, v, cb) => {
                const val = String(v || '').trim()
                if (!val) return cb(new Error('请再次输入密码'))
                cb(val === String(regForm.password || '').trim() ? undefined : new Error('两次密码不一致'))
            },
            trigger: 'blur'
        }
    ]
}

const handleRegister = async () => {
    try {
        await regFormRef.value.validate()
    } catch {
        return
    }
    loading.value = true
    try {
        const res = await registerApi({ username: regForm.username.trim(), password: regForm.password.trim() })
        if (res.code !== 200) {
            ElMessage.error(res.msg || '注册失败')
            return
        }
        ElMessage.success('注册成功，请登录')
        loginForm.username = regForm.username.trim()
        loginForm.password = ''
        regForm.password = regForm.confirm = ''
        activeTab.value = 'login'
    } catch (err) {
        ElMessage.error('网络异常，请稍后重试')
    } finally {
        loading.value = false
    }
}
</script>

<style>
.auth-dialog {
    position: fixed !important;
    top: 80px !important;
    right: 30px !important;
    left: auto !important;
    margin: 0 !important;
    border-radius: 12px;
    overflow: hidden;
}
.auth-dialog .submit-btn {
    width: 100%;
}
</style>
