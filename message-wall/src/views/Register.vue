<template>
  <div class="auth-page">
    <el-card class="auth-card" shadow="always">
      <h2 class="auth-title">注册留言墙</h2>
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
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请确认密码"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="auth-btn" @click="handleRegister">
            注册
          </el-button>
        </el-form-item>

        <el-form-item>
          <el-button link type="primary" @click="goLogin">
            返回登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
/* eslint-disable vue/multi-word-component-names */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { registerApi } from '@/api/index'

const router = useRouter()

const formRef = ref(null)
const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

// 用户名：trim 后必填，3~20 位，仅允许字母、数字、下划线
const validateUsername = (rule, value, callback) => {
  const v = String(value || '').trim()
  if (!v) {
    callback(new Error('请输入用户名'))
  } else if (v.length < 3 || v.length > 20) {
    callback(new Error('用户名长度需为 3~20 个字符'))
  } else if (!/^\w+$/.test(v)) {
    callback(new Error('用户名只能包含字母、数字和下划线'))
  } else {
    callback()
  }
}

// 密码：trim 后必填，6~20 位
const validatePassword = (rule, value, callback) => {
  const v = String(value || '').trim()
  if (!v) {
    callback(new Error('请输入密码'))
  } else if (v.length < 6 || v.length > 20) {
    callback(new Error('密码长度需为 6~20 个字符'))
  } else {
    callback()
  }
}

// 确认密码自定义校验器：与密码对比，不一致提示"两次密码不一致"
const validateConfirmPassword = (rule, value, callback) => {
  const v = String(value || '').trim()
  if (!v) {
    callback(new Error('请确认密码'))
  } else if (v !== String(form.password || '').trim()) {
    callback(new Error('两次密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 点击注册
const handleRegister = async () => {
  if (!formRef.value) return

  // 第一层：表单校验，不通过静默 return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  // 第二层：校验通过才发请求，捕获网络异常
  try {
    const res = await registerApi({
      username: form.username.trim(),
      password: form.password.trim()
    })

    if (res.code !== 200) {
      ElMessage.error(res.msg)
      return
    }

    ElMessage.success('注册成功')
    router.push('/login')
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  }
}

// 返回登录
const goLogin = () => {
  router.push('/login')
}
</script>

<style lang="less" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
.auth-card {
  width: 360px;
  padding: 10px 20px 20px;
}
.auth-title {
  text-align: center;
  margin: 10px 0 24px;
  color: #303133;
}
.auth-btn {
  width: 100%;
}
</style>
