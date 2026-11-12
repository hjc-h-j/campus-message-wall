<template>
  <div class="admin-page dashboard-cards">
    <h2 class="admin-title">仪表盘</h2>

    <el-row :gutter="16">
      <el-col v-for="item in stats" :key="item.label" :xs="12" :sm="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-icon" :class="item.color">
              <el-icon :size="24"><component :is="item.icon" /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-label">{{ item.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, ChatLineRound, Picture, ChatDotRound } from '@element-plus/icons-vue'
import { getDashboardApi } from '@/api/index'

// 四张统计卡片：图标 + 颜色 + 初始值 0
const stats = ref([
  { label: '总留言数', value: 0, color: 'indigo', icon: Document },
  { label: '文字留言', value: 0, color: 'green',  icon: ChatLineRound },
  { label: '图片留言', value: 0, color: 'orange', icon: Picture },
  { label: '评论总数', value: 0, color: 'red',    icon: ChatDotRound }
])

const loadStats = async () => {
  try {
    const res = await getDashboardApi()
    if (res.code !== 200) {
      ElMessage.error(res.msg)
      return
    }
    const { total, textCount, imgCount, commentCount } = res.data
    stats.value = [
      { label: '总留言数', value: total,        color: 'indigo', icon: Document },
      { label: '文字留言', value: textCount,    color: 'green',  icon: ChatLineRound },
      { label: '图片留言', value: imgCount,     color: 'orange', icon: Picture },
      { label: '评论总数', value: commentCount, color: 'red',    icon: ChatDotRound }
    ]
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  }
}

onMounted(loadStats)
</script>

<style scoped>
/* Dashboard 统计卡使用全局 admin.css 的 .stat-card / .stat-icon 样式 */
</style>
