<template>
  <div class="admin-page">
    <h2 class="admin-title">用户管理</h2>

    <!-- 用户列表（只读） -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="id" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column label="头像" width="100">
        <template #default="{ row }">
          <!-- 有头像显示小图，无值显示 - -->
          <el-image v-if="row.imgurl" :src="imgSrc(row.imgurl)" fit="cover" class="avatar-img" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <!-- role=1 管理员（危险红），role=0 普通用户（信息灰） -->
          <el-tag :class="Number(row.role) === 1 ? 'tag-admin' : 'tag-user'">
            {{ Number(row.role) === 1 ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination class="pager"
      v-model:current-page="page"
      v-model:page-size="pagesize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="loadList"
      @size-change="handleSizeChange" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAdminUsersApi } from '@/api/index'
import { baseUrl } from '@/utils/env'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pagesize = ref(10)
const loading = ref(false)

// 头像地址：后端返回相对路径时拼后端域名，blob/data/绝对 URL 直接使用
const imgSrc = url => {
  if (!url) return ''
  return /^(blob:|data:|https?:)/.test(url) ? url : baseUrl + url
}

// 拉取用户分页列表
const loadList = async () => {
  loading.value = true
  try {
    const res = await getAdminUsersApi({ page: page.value, pagesize: pagesize.value })
    if (res.code === 200) {
      list.value = res.data.list
      total.value = res.data.total
    } else {
      ElMessage.error(res.msg)
    }
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 切换每页条数：回到第一页重新查询
const handleSizeChange = () => {
  page.value = 1
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
/* 页面容器、标题、表格、分页等通用样式由全局 admin.css 提供 */

/* 表格里的头像缩略图 */
.avatar-img {
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
</style>
