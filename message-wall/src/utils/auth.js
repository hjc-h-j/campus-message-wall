import { reactive } from 'vue'

// 全局认证状态：弹窗开关 + 用户版本号（登录/退出后 bump，各组件据此刷新）
export const authState = reactive({
    showDialog: false,  // 登录/注册弹窗是否显示
    userVersion: 0      // 用户状态版本号，变化即触发依赖它的 computed 重算
})

// 是否真实登录：token 存在且 !== 'guest'（'guest' 按游客处理）
export function isLoggedIn() {
    const t = localStorage.getItem('token')
    return !!t && t !== 'guest'
}

// 读取当前用户信息（未登录返回 null）
export function getUserInfo() {
    try {
        return JSON.parse(localStorage.getItem('userInfo') || 'null')
    } catch (e) {
        return null
    }
}

// 打开登录/注册弹窗
export function openAuthDialog() {
    authState.showDialog = true
}

// 关闭弹窗
export function closeAuthDialog() {
    authState.showDialog = false
}

// 通知所有组件刷新用户状态（头像、未读数、按钮显隐等）
export function refreshUserState() {
    authState.userVersion++
}

// 登录门禁：已登录返回 true；游客打开登录弹窗并返回 false（调用方直接 return）
export function requireLogin() {
    if (isLoggedIn()) return true
    openAuthDialog()
    return false
}
