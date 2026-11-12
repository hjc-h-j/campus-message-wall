<template>
  <el-container class="admin-layout">
    <!-- 左侧侧边栏 -->
    <el-aside class="admin-aside">
      <div class="admin-logo">留言墙后台</div>
      <el-menu
        :default-active="route.path"
        router
      >
        <el-menu-item index="/admin/index">
          <el-icon><DataAnalysis /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/card">
          <el-icon><Picture /></el-icon>
          <span>留言管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/tag">
          <el-icon><PriceTag /></el-icon>
          <span>标签管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/user">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/comment">
          <el-icon><ChatDotRound /></el-icon>
          <span>评论管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部栏 -->
      <el-header class="admin-header">
        <span class="header-title">{{ pageTitle }}</span>
        <div class="header-right">
          <img
            v-if="userInfo.imgurl"
            :src="userInfo.imgurl"
            class="user-avatar"
            alt="avatar"
          />
          <el-icon v-else class="user-avatar-default"><UserFilled /></el-icon>
          <span class="user-name">{{ userInfo.username }}</span>
          <el-button link type="danger" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DataAnalysis, Picture, PriceTag, User, ChatDotRound, UserFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 从 localStorage 安全解析 userInfo
const parseUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}
const userInfo = reactive(parseUserInfo())

// 根据当前路由显示页面标题
const pageTitle = computed(() => {
  const map = {
    '/admin/index': '仪表盘',
    '/admin/card': '留言管理',
    '/admin/tag': '标签管理',
    '/admin/user': '用户管理',
    '/admin/comment': '评论管理'
  }
  return map[route.path] || '管理后台'
})

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户点取消：静默处理
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.user-avatar-default {
  font-size: 24px;
  color: var(--text-sub);
}
</style>
