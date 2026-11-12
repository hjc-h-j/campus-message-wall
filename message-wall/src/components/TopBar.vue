<template>
    <div class="top-bar">
        <div class="logo">
            <img src="@/assets/images/yksg.svg" alt="" class="logo-img">
            <p class="logo-name">一刻时光</p>
        </div>
        <div class="menu">
            <YkButton :nom="id==0?'cprimary':'cesecondary'" size="max" class="menu-message" @click="changeWall(0)">留言墙</YkButton>
            <YkButton :nom="id==1?'cprimary':'cesecondary'" size="base" class="menu-photo" @click="changeWall(1)">照片墙</YkButton>
        </div>
        <div class="user">
            <!-- 已登录：头像（带未读红点），点击去个人空间 -->
            <el-badge v-if="!isGuest" :value="unread" :hidden="unread === 0" :max="99" class="avatar-badge">
                <div class="avatar-wrap">
                    <div class="user-head" :style="{ backgroundImage: avatarBg }" @click="goSpace">
                        <!-- 无自定义头像时显示 icon-yonghu -->
                        <span v-if="showUserIcon" class="iconfont icon-yonghu head-icon"></span>
                    </div>
                    <!-- 悬停头像下方浮出"个人空间"提示 -->
                    <div class="space-tip">个人空间</div>
                </div>
            </el-badge>
            <!-- 游客：登录/注册按钮，打开右上角登录弹窗 -->
            <p class="login-bt" v-else @click="openAuthDialog">登录/注册</p>
        </div>
    </div>
</template>

<script>
import YkButton from './YkButton.vue'
import { getUnreadCountApi } from '@/api/index.js'
import { portrait } from '@/utils/data.js'
import { authState, isLoggedIn, getUserInfo, openAuthDialog } from '@/utils/auth.js'
export default {
    data(){
        return{
            unread: 0,          // 未读消息数
            authState,          // 全局认证状态（模板/计算属性依赖）
            openAuthDialog,     // 打开登录弹窗（模板直接用）
        }
    },
   components:{
    YkButton,
   },
   computed:{
    id(){
      return this.$route.query.id;
    },
    // 是否游客：token 不存在或为 'guest'；userVersion 变化时重算
    isGuest(){
      return this.authState.userVersion >= 0 ? !isLoggedIn() : true
    },
    // 头像背景：/photo/ 拼后端域名；数字序号走渐变；兜底无背景（显示 icon-yonghu）
    avatarBg(){
      const u = this.authState.userVersion >= 0 ? getUserInfo() : null
      const s = String((u && u.imgurl) || '')
      if (s.startsWith('/photo/')) return `url(http://localhost:3000${s})`
      if (s && portrait[s]) return portrait[s]
      return 'none'
    },
    // 是否显示默认头像图标（无 /photo/ 路径且非渐变序号）
    showUserIcon(){
      const u = this.authState.userVersion >= 0 ? getUserInfo() : null
      const s = String((u && u.imgurl) || '')
      return !(s.startsWith('/photo/') || (s && portrait[s]))
    }
   },
   methods:{
    // 切换
    changeWall(e){
        this.$router.push({
            query:{id:e},
        })
    },
    // 去个人空间
    goSpace(){
        this.$router.push('/user-space')
    },
    // 查未读消息数（游客不查）
    loadUnread(){
        if (this.isGuest) { this.unread = 0; return }
        getUnreadCountApi().then(res => {
            if (res.code === 200) this.unread = res.data.unread
        }).catch(() => {})
    }
   },
   mounted(){
    this.loadUnread()
   },
   watch:{
    // 路由切换、登录/退出后重查未读数（isGuest 变化也兜底）
    '$route'(){ this.loadUnread() },
    'authState.userVersion'(){ this.loadUnread() }
   }

}
</script>

<style lang="less" scoped>
.top-bar{
    width:100%;
    height: 52px;
    background: rgba(255,255,255,0.80);
    box-shadow: 0px 0px 4px 0px rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
    position: fixed;
    top:0;
    left:0;
    z-index: 9999;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 30px;
    box-sizing: border-box;
    .logo{
        display: flex;
        justify-content: space-between;
        align-items: center;
        .logo-name{
            font-size:20px;
            color:@gray-1;
            font-family: 600;
            padding-left: 10px;
        }
    }
    .menu{
        .menu-message{
            margin-right: 24px;
        }
    }
    .user{
        width: 200px;
        .avatar-badge{
            float:right;
        }
        .avatar-wrap{
            position: relative;
            // 悬停时浮出提示
            &:hover .space-tip{
                opacity: 1;
                transform: translate(-50%, 0);
            }
            .space-tip{
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translate(-50%, -4px);
                margin-top: 6px;
                background: #fff;
                color: @gray-1;
                font-size: 12px;
                line-height: 1;
                padding: 7px 12px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: all .2s;
                z-index: 10000;
            }
        }
        .user-head{
            border-radius: 50%;
            height: 36px;
            width: 36px;
            background-size: cover;
            background-position: center;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            .head-icon{
                font-size: 24px;
                color: #b9c0c8;
            }
        }
        .login-bt{
            float:right;
            line-height: 36px;
            color: @primary-color;
            cursor: pointer;
            font-size: @size-16;
        }
    }
}
</style>