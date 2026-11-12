<template>
    <div class="wall-index">
        <topBar></topBar>
        <!-- <video src="@/assets/images/qm1.mp4" autoplay="autoplay" muted="muted" loop="loop" class="bg-video"></video> -->
         <router-view></router-view>
         <FootBar></FootBar>
         <!-- 登录/注册弹窗（右上角），全局共用 -->
         <AuthDialog />
    </div>
</template>

<script>
import topBar from '@/components/TopBar.vue';
import FootBar from '@/components/FootBar.vue';
import AuthDialog from '@/components/AuthDialog.vue';
import { signIpApi } from '@/api/index';
import { isLoggedIn, getUserInfo } from '@/utils/auth.js';
export default {
    data(){
          return{
            aaa:'',
          }
    },

    components:{
        // 组件
        topBar,FootBar,AuthDialog,
    },
    computed:{
        // 变量
    },
    created(){
     this.getUser()
    },
  methods:{
  getUser(){
    // 已登录：身份标识用数据库 id（登录存id）；未登录：游客用 IP
    if (isLoggedIn()) {
      const u = getUserInfo()
      if (u && u.id !== undefined && u.id !== null) {
        this.$store.commit('getUser', { id: String(u.id) })
        return
      }
    }
    // 游客：取访问者 IP 作为身份标识
    signIpApi().then((res)=>{
      this.$store.commit('getUser',{ id: res.ip })
    }).catch(err => {
      console.log('请求出错：', err)
    })
  }
}

}
</script>

<style lang="less" scoped>
.wall-index{
  .bg-video{
    position: fixed;
    top:0;
    left:0;
    z-index: -1;
    height: 800px;
  }
}

</style>