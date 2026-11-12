<template>
    <div class="yk-photo-card">
        <img :src="imgSrc" alt="" class="photo-img" >
        <div class="photo-bg" @click="toDetail"></div>
        <div class="photo-like" @click="clickLike">
            <span class="iconfont icon-aixin" :class="{islike:card.islike>0}"></span>
            <span class="like-data">{{ photo.like }}</span>
        </div>
    </div>
</template>

<script>
import { baseUrl } from '@/utils/env';
import {insertFeedbackApi} from '@/api/index'
import {requireLogin} from '@/utils/auth.js'
export default {
    data(){
        return{
            baseUrl,
        }
    },
    props:{
        photo:{
            type:Object,
          default: ()=>({})
        }
    },
    computed:{
        imgSrc(){
            if(this.photo?.imgurl == null) return ""
            //后端返回 /photo/xxx.jpg，拼上后端域名；本地预览的 blob: 地址直接使用
            const url = this.photo.imgurl;
            if(/^(blob:|data:|https?:)/.test(url)) return url;
            return this.baseUrl + url;
        },
        card(){
            return this.photo;
        },
        user() {
            return this.$store.state.user || {};
        }
    },
    methods:{
        // 显示详情
         toDetail(){
            this.$emit('toDetail')
        },
        // 点击喜欢（游客先弹登录）：未赞->点赞(type=0)，已赞->撤销(type=2)
        clickLike(){
            if (!requireLogin()) return
            const type = this.card.islike == 0 ? 0 : 2
            let data={
                wallId:this.card.id,
                userId:this.user.id,
                type:type,
                moment:new Date(),
            }
            insertFeedbackApi(data).then(()=>{
                // 反馈完成：本地同步更新
                if(type === 0){
                    this.card.like++;
                    this.card.islike++;
                }else{
                    this.card.like = Math.max(0, this.card.like - 1);
                    this.card.islike = 0;
                }
            })
        }
    },
    created(){
        // console.log(this.card);
    }
}
</script>

<style lang="less" scoped>
.yk-photo-card {
    position: relative;

    .photo-img {
        width: 100%;
    }

    .photo-bg {
        position: absolute;
        top: 0;
        left: 0;
        background: rgba(0, 0, 0, 0.2);
        height: 100%;
        width: 100%;
        opacity: 0;
        transition: @tr;
        cursor: pointer;
    }

    .photo-like {
        position: absolute;
        left: @padding-8;
        top: @padding-8;
        background: rgba(255, 255, 255, 0.80);
        border-radius: 20px;
        height: 28px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: @tr;
        cursor: pointer;

        .icon-xiai {
            color: @gray-3;
            padding-right: @padding-4;
        }

        .like-data {
            color: @gray-1;
        }
    }

    &:hover {
        .photo-bg {
            opacity: 1;
        }
        .islike{
            color:@like; 
         }

        .photo-like {
            opacity: 1;
        }
        
        .islike{
                color: @like;
            }
    }
}

</style>