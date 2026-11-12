<template>
  <div class="admin-page">
    <!-- 页面标题 + 右上角新增按钮 -->
    <div class="page-head">
      <h2 class="admin-title">标签管理</h2>
      <el-button type="primary" @click="openAdd">新增标签</el-button>
    </div>

    <!-- 标签列表（不分页） -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="id" width="80" />
      <el-table-column prop="name" label="标签名称" />
      <el-table-column label="类型" width="140">
        <template #default="{ row }">
          <el-tag :type="Number(row.type) === 0 ? 'info' : 'success'">
            {{ Number(row.type) === 0 ? '留言墙' : '照片墙' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑共用弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑标签' : '新增标签'" width="420px"
      :close-on-click-modal="false">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标签名称">
          <el-input v-model="form.label_name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="留言墙" :value="0" />
            <el-option label="照片墙" :value="1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminTagsApi,
  addAdminTagApi,
  updateAdminTagApi,
  deleteAdminTagApi
} from '@/api/index'

const list = ref([])
const loading = ref(false)

// 弹窗：新增 / 编辑共用
const dialogVisible = ref(false)
const submitLoading = ref(false)
const isEdit = ref(false)
// 提交给后端的字段名必须是 label_name 和 type
const form = ref({ id: null, label_name: '', type: 0 })

// 拉取标签列表，后端返回 { list: [{id, name, type}] }
const loadList = async () => {
  loading.value = true
  try {
    const res = await getAdminTagsApi()
    if (res.code === 200) {
      list.value = res.data.list
    } else {
      ElMessage.error(res.msg)
    }
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 打开新增弹窗：重置表单
const openAdd = () => {
  isEdit.value = false
  form.value = { id: null, label_name: '', type: 0 }
  dialogVisible.value = true
}

// 打开编辑弹窗：回填当前行数据
const openEdit = row => {
  isEdit.value = true
  form.value = { id: row.id, label_name: row.name, type: Number(row.type) }
  dialogVisible.value = true
}

// 提交：新增调 POST，编辑调 PUT
const handleSubmit = async () => {
  submitLoading.value = true
  try {
    const payload = { label_name: form.value.label_name, type: form.value.type }
    const res = isEdit.value
      ? await updateAdminTagApi(form.value.id, payload)
      : await addAdminTagApi(payload)
    if (res.code === 200) {
      ElMessage.success(res.msg)
      dialogVisible.value = false
      loadList()
    } else {
      ElMessage.error(res.msg)
    }
  } catch (err) {
    ElMessage.error('网络异常，请稍后重试')
  } finally {
    submitLoading.value = false
  }
}

// 删除：先二次确认，再调 DELETE
const handleDelete = async row => {
  try {
    await ElMessageBox.confirm(`确定删除标签「${row.name}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
  } catch (err) {
    return // 用户取消
  }
  try {
    const res = await deleteAdminTagApi(row.id)
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
/* 页面容器、标题、卡片、表格等通用样式由全局 admin.css 提供 */

/* 标题与新增按钮同一行，按钮靠右 */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
