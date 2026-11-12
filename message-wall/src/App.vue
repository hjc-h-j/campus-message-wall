<template>
  <router-view></router-view>
</template>

<script>

export default {
  name: 'App',
  components: {
  
  },
  created() {
    // 全局拉取一次标签表数据，供各页面使用（action 内带缓存）
    this.$store.dispatch('loadLabels').catch(() => {});
  }
}
</script>

<style lang="less">
@import './assets/fonts/icon/iconfont.css';


</style>
