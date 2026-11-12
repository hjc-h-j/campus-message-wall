<template>
  <!-- 半透明浮层背景：position fixed 铺满全屏，毛玻璃效果 -->
  <div class="login-overlay">
    <!-- 登录卡 -->
    <div class="login-card">
      <!-- 标题 -->
      <h2 class="login-title">登录</h2>

      <!-- 登录表单 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        size="large"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >登录</el-button>
        </el-form-item>
      </el-form>

      <!-- 去注册链接 -->
      <div class="register-link">
        <span class="link-text">没有账号？</span>
        <el-button link type="primary" @click="goRegister">去注册</el-button>
      </div>

      <!-- 游客登录按钮 -->
      <el-button class="guest-btn" @click="handleGuestLogin">游客登录，无需注册</el-button>
    </div>
  </div>
</template>

<script setup>
/* eslint-disable vue/multi-word-component-names */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { loginApi } from '@/api/index'

const router = useRouter()

const formRef = ref(null)
const loading = ref(false)

// 表单数据
const form = reactive({
  username: '',
  password: ''
})

// 必填校验
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 点击登录
const handleLogin = async () => {
  if (!formRef.value) return

  // 第一层：表单校验，不通过静默 return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  // 第二层：发请求，捕获网络异常
  loading.value = true
  try {
    const res = await loginApi({
      username: form.username,
      password: form.password
    })

    if (res.code !== 200) {
      ElMessage.error(res.msg)
      return
    }

    // 存 token 和 userInfo
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userInfo', JSON.stringify(res.data.userInfo))
    ElMessage.success(res.msg || '登录成功')

    // role===1 跳后台，否则跳首页
    router.push(Number(res.data.userInfo.role) === 1 ? '/admin/index' : '/')
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 游客登录
const handleGuestLogin = async () => {
  try {
    await ElMessageBox.confirm(
      '游客身份只能浏览，无法管理后台',
      '游客登录提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    // 点取消，静默 return
    return
  }

  // 存占位 token 让路由守卫放行，游客无真实 token
  localStorage.setItem('token', 'guest')
  localStorage.setItem('userInfo', JSON.stringify({
    id: 'guest',
    username: '游客',
    role: 0,
    imgurl: ''
  }))
  ElMessage.success('游客登录成功')
  router.push('/')
}

// 去注册
const goRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
/* 半透明毛玻璃背景：铺满全屏 + 模糊背景图 + 白色半透明遮罩 */
.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/*
.login-overlay::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: url('https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=soft%20warm%20sunset%20gradient%20golden%20orange%20to%20soft%20pink%20blurred%20bokeh%20dreamy%20atmosphere%20minimal%20abstract&image_size=landscape_4_3') center/cover no-repeat;
  filter: blur(12px);
  z-index: 0;
}
*/

/* 白色半透明遮罩 —— 已取消 */
/*
.login-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.5);
  z-index: 1;
}
*/

/* 登录卡 */
.login-card {
  position: relative;
  z-index: 2;
  width: 380px;
  background: #fff;        /* 纯白背景 */
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 40px;
  box-sizing: border-box;
}

/* 标题：20px 600 #303133 居中 */
.login-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  text-align: center;
  margin: 0 0 24px 0;
}

/* 表单文字 14px #303133 */
.login-card :deep(.el-input__inner) {
  font-size: 14px;
  color: #303133;
}

/* 登录按钮全宽 */
.login-btn {
  width: 100%;
}

/* 去注册链接区域 */
.register-link {
  text-align: center;
  margin-bottom: 16px;
}

/* 说明文字 13px #909399 */
.link-text {
  font-size: 13px;
  color: #909399;
}

/* 游客登录按钮：次要样式 */
.guest-btn {
  width: 100%;
  font-size: 13px;
  color: #909399;
}
</style>
