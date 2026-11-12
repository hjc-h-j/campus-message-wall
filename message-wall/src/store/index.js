import { createStore } from 'vuex'
import { findLabelApi } from '@/api/index'

// 创建一个新的 store 实例
const store = createStore({
    state() {
        return {
            count: 0,
            user: '',
            labels: [],   // 后端 label 表全部标签 [{id, label_name, type}]
        }
    },
    getters: {
        // 按墙类型取标签数组：0留言墙 1照片墙
        labelsByType: (state) => (type) =>
            state.labels.filter(l => l.type === Number(type)),
        // 按标签真实 id 取标签名
        labelName: (state) => (id) => {
            const f = state.labels.find(l => l.id === id)
            return f ? f.label_name : ''
        }
    },
    mutations: {
        increment(state) {
            state.count++
        },
        getUser(state, n) {
            state.user = n;
        },
        setLabels(state, list) {
            state.labels = Array.isArray(list) ? list : [];
        }
    },
    actions: {
        // 拉取全部标签，带缓存，已加载则不重复请求
        async loadLabels({ state, commit }) {
            if (state.labels.length > 0) return state.labels;
            const res = await findLabelApi();
            commit('setLabels', res.message || []);
            return state.labels;
        }
    }
})

export default store
