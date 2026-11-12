<template>
    <div class="yk-node-card" :class="{ 'full-mode': full }" :style="{width:width,background:cardColor[card.color]}" @click="toDetail">
        <div class="top">
            <p class="titme">{{ dateOne(card.moment) }}</p>
            <p class="label">{{ labelText }}</p>
        </div>
        <p class="message">{{ card.message }}</p>
        <div class="foot">
            <div class="foot-left">
                <div class="icon" @click.stop="clickLike">
                        <span class="iconfont icon-aixin" :class="{islike:card.islike>0}"></span>
                    <span class="value">{{card.like}}</span>
                </div>
                <div class="icon" v-show="card.comcount>0">
                    <span class="iconfont icon-liuyan" ></span>
                    <span class="value">{{card.comcount}}</span>
                </div>
            </div>
            <div class="name">{{card.name || '匿名'}}</div>
        </div>
    </div>
</template>


<script>
import {cardColor} from '@/utils/data'
import {dateOne} from '@/utils/yksg'
import {insertFeedbackApi} from '@/api/index'
import {requireLogin} from '@/utils/auth.js'
export default {
    data(){
        return{
            cardColor,
            dateOne,
        }
    },
    props:{
        width:{
            default:'100%',
        },
        note:{
            type:Object,
          default: ()=>({})
        },
        full:{
            type:Boolean,
            default:false
        }
    },
    computed:{
        card(){
            return this.note;
        },
        // 标签名：按卡片存的真实 label.id 从 label 表取
        labelText(){
            return this.$store.getters.labelName(this.card.label) || '';
        },
        // 从 store 取游客IP，响应式更新
        user() {
            return this.$store.state.user || {};
        }
    },
    created(){
        console.log(this.card);
        
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
    }
}
</script>

<style lang="less" scoped>

.yk-node-card {
    height: 240px;
    background:rgba(252, 175, 162, 0.30) ;
    padding: 10px 20px 60px;
    box-sizing: border-box;
    position: relative;
    cursor: pointer;

    .top {
        display: flex;
        justify-content: space-between;
        padding-bottom: 16px;

        p {
            font-size: @size-12;
            color: @gray-3;
        }
    }

    .message {
        height: 140px;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family:fa;
        font-size: @size-14;
        color: @gray-1;
        line-height: 22px;
    }

    // 详情页 full 模式：取消截断，卡片自适应高度，message 超过10行出滚动条
    &.full-mode {
        height: auto;
        padding-bottom: 70px;
        .message {
            display: block;
            -webkit-line-clamp: unset;
            line-clamp: unset;
            -webkit-box-orient: initial;
            text-overflow: unset;
            overflow-y: auto;
            max-height: 220px; // 10 行约 220px，超出出滚动条
        }
    }

    .foot {
        display: flex;
        justify-content: space-between;
        position: absolute;
        bottom: 16px;
        left: 0;
        padding: 0 @padding-20;
        box-sizing: border-box;
        width: 100%;

        .foot-left {
            display: flex;

            .value {
                font-size: @size-12;
                color: @gray-3;
                line-height: 16px;
                padding-left: @padding-4;
            }

            .iconfont{
                font-size: @size-16;
                color: @gray-3;
            }

            .icon{
                padding-right: @padding-8;
                display: flex;
                align-items: center;
            }

            .icon-aixin{
                cursor: pointer;
                transition: @tr;
                &:hover{
                    color:@like;
                }
            }
            .islike{
               color:@like; 
            }
        }
    }

    .name{
        font-family: fa;
        font-size: @size-16;
        color: @gray-1;

    }
}
</style>