<template>
  <div class="admin-page">
    <h2 class="admin-title">留言管理</h2>

    <!-- 顶部筛选栏：类型筛选，全部则不传 type -->
    <div class="filter-bar">
      <el-select v-model="type" placeholder="请选择类型" style="width: 160px" @change="handleTypeChange">
        <el-option label="全部" :value="''" />
        <el-option label="留言墙" :value="0" />
        <el-option label="照片墙" :value="1" />
      </el-select>
    </div>

    <!-- 卡片列表 -->
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="id" label="id" width="70" />
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          <el-tag :class="Number(row.type) === 0 ? 'tag-text' : 'tag-photo'">
            {{ Number(row.type) === 0 ? '文字留言' : '照片卡片' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="内容" min-width="180" show-overflow-tooltip />
      <el-table-column label="图片" width="90">
        <template #default="{ row }">
          <!-- 有图片显示小图（可点击预览），无图片显示 - -->
          <el-image v-if="row.imgurl" :src="imgSrc(row.imgurl)" :preview-src-list="[imgSrc(row.imgurl)]"
            fit="cover" class="table-img" preview-teleported />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="label" label="标签" width="80" />
      <el-table-column label="颜色" width="90">
        <template #default="{ row }">
          <!-- 用背景色块展示颜色编号 -->
          <span class="color-block" :style="{ background: colorOf(row.color) }">{{ row.color }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="moment" label="发布时间" width="180" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination class="pager" v-model:current-page="page" v-model:page-size="pagesize" :total="total"
      :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next, jumper" @current-change="loadList"
      @size-change="handleSizeChange" />

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="编辑卡片" width="480px" :close-on-click-modal="false">
      <el-form :model="form" label-width="70px">
        <el-form-item label="内容">
          <el-input v-model="form.message" type="textarea" :rows="4" placeholder="请输入留言内容" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.label" placeholder="请输入标签 id" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-input v-model="form.color" placeholder="请输入颜色编号" />
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
import { getAdminWallsApi, updateAdminWallApi, deleteAdminWallApi } from '@/api/index'
import { cardColor } from '@/utils/data'
import { baseUrl } from '@/utils/env'

// 筛选类型：'' 表示全部（不传 type）
const type = ref('')
const page = ref(1)
const pagesize = ref(10)
const total = ref(0)
const list = ref([])
const loading = ref(false)

// 编辑弹窗
const dialogVisible = ref(false)
const submitLoading = ref(false)
const form = ref({ id: null, message: '', label: '', color: '' })

// 图片地址：后端返回相对路径 /photo/xxx.jpg，需拼后端域名；本地预览的 blob:/data: 直接使用
const imgSrc = url => {
  if (!url) return ''
  return /^(blob:|data:|https?:)/.test(url) ? url : baseUrl + url
}

// 颜色编号 → 色块背景色，越界兜底为透明
const colorOf = index => cardColor[index] || 'transparent'

// 拉取卡片分页列表
const loadList = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pagesize: pagesize.value }
    // 只有选中具体类型才带 type，避免"全部"传空值
    if (type.value !== '') params.type = type.value
    const res = await getAdminWallsApi(params)
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

// 切换类型：回到第一页重新查询
const handleTypeChange = () => {
  page.value = 1
  loadList()
}

// 切换每页条数：回到第一页重新查询
const handleSizeChange = () => {
  page.value = 1
  loadList()
}

// 打开编辑弹窗，回填当前行数据
const openEdit = row => {
  form.value = {
    id: row.id,
    message: row.message ?? '',
    label: row.label ?? '',
    color: row.color ?? ''
  }
  dialogVisible.value = true
}

// 提交编辑
const handleSubmit = async () => {
  submitLoading.value = true
  try {
    const res = await updateAdminWallApi(form.value.id, {
      message: form.value.message,
      label: form.value.label,
      color: form.value.color
    })
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

// 删除：先二次确认，再调接口
const handleDelete = async row => {
  try {
    await ElMessageBox.confirm(`确定删除卡片「${row.id}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
  } catch (err) {
    return // 用户取消删除
  }
  try {
    const res = await deleteAdminWallApi(row.id)
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
/* 页面容器、标题、卡片、表格、分页等通用样式统一由全局 admin.css 提供 */

/* 筛选栏与表格的间距 */
.filter-bar {
  margin-bottom: 16px;
}

/* 表格里的缩略图 */
.table-img {
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 4px;
}

/* 颜色编号色块 */
.color-block {
  display: inline-block;
  min-width: 44px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  text-align: center;
  font-size: 12px;
  color: var(--text-sub);
}
</style>
