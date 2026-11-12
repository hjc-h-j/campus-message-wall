<template>
  <div class="admin-page">
    <h2 class="admin-title">评论管理</h2>

    <!-- 评论列表 -->
    <el-table v-loading="tableLoading" :data="list" border stripe>
      <el-table-column prop="id" label="id" width="70" />
      <el-table-column prop="wallId" label="所属卡片id" width="100" />
      <el-table-column label="所属卡片内容" min-width="180">
        <template #default="{ row }">
          <!-- wallMessage 严格等于 null：原卡片已删除；空字符串属于正常内容，正常渲染 -->
          <span v-if="row.wallMessage === null" class="wall-deleted">卡片已删除</span>
          <span v-else class="text-ellipsis" :title="row.wallMessage">{{ row.wallMessage }}</span>
        </template>
      </el-table-column>
      <el-table-column label="评论内容" min-width="180">
        <template #default="{ row }">
          <!-- 文本省略做空值安全：null/undefined/'' 都按空串处理 -->
          <span class="text-ellipsis" :title="row.content">{{ row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="userId" label="评论人userId" width="120" />
      <el-table-column prop="moment" label="评论时间" width="180" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminCommentsApi, deleteAdminCommentApi } from '@/api/index'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pagesize = ref(10)
const tableLoading = ref(false)

// 拉取评论分页列表
const loadList = async () => {
  tableLoading.value = true
  try {
    const res = await getAdminCommentsApi({ page: page.value, pagesize: pagesize.value })
    if (res.code === 200) {
      list.value = res.data.list
      total.value = res.data.total
    } else {
      ElMessage.error(res.msg)
    }
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    // 无论成功失败都必须关闭 loading，防止永久转圈
    tableLoading.value = false
  }
}

// 切换每页条数：回到第一页重新查询
const handleSizeChange = () => {
  page.value = 1
  loadList()
}

// 删除：先二次确认，确认后调 DELETE；取消单独过滤，不当成网络异常
const handleDelete = async row => {
  try {
    await ElMessageBox.confirm(`确定删除评论「${row.id}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
  } catch (err) {
    // ElMessageBox 点取消会抛异常；这里统一静默 return，不弹网络异常
    return
  }
  try {
    const res = await deleteAdminCommentApi(row.id)
    if (res.code === 200) {
      ElMessage.success(res.msg)
      loadList()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  }
}

onMounted(loadList)
</script>

<style scoped>
/* 页面容器、标题、表格、分页等通用样式由全局 admin.css 提供 */

/* 卡片已删除的灰色提示 */
.wall-deleted {
  color: var(--text-sub);
  font-style: italic;
}

/* 文本过长省略：单行截断，hover title 展示完整原文 */
.text-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
