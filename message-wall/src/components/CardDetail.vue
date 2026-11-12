<template>
    <div class="card-detail">
        <div class="top-bt">
            <p class="revoke">联系墙主撕掉该便签</p>
            <p class="report">举报</p>
        </div>
        <NoteCard :note="card" full></NoteCard>
        <div class="form">
            <textarea class="message" placeholder="请输入..." v-model="discuss"></textarea>
            <div class="bt">
                <input type="text" class="name" placeholder="签名" v-model="name">
                <YkButton :class="{notallowed: !isDis}" @click="submit">评论</YkButton>
            </div>
        </div>
        <p class="title">评论{{ card.comcount }}</p>
        <div class="commont">
            <div class="commont-li" v-for="(e,index) in commentList" :key="index">
                <div class="user-head" :style="{backgroundImage:portrait[e.imgurl] || portrait[0]}"></div>
                <div class="comm-m">
                    <div class="m-top">
                        <p class="name">{{ e.name || '匿名' }}</p>
                        <p class="time">{{ dateOne(e.moment) }}</p>
                    </div>
                    <div class="mm">{{ e.comment}}</div>
                    <p class="reply-bt" v-if="isLogin" @click="openReply(e)">回复</p>

                    <div class="reply-form" v-if="replyToId === e.id">
                        <div class="reply-tip">回复 <span class="at">@{{ replyToName }}</span></div>
                        <textarea class="message" placeholder="请输入回复..." v-model="replyText"></textarea>
                        <div class="bt">
                            <input type="text" class="name" placeholder="签名" v-model="replyName">
                            <YkButton :class="{notallowed: !canReply}" @click="submitReply">提交</YkButton>
                            <YkButton class="cancel" @click="cancelReply">取消</YkButton>
                        </div>
                    </div>

                    <!-- 展开/折叠按钮 -->
                    <p class="toggle-replies" v-if="getReplyCount(e) > 0" @click="toggleReplies(e.id)">
                        {{ showMap[e.id] ? '收起' : '展开' + getReplyCount(e) + '条回复' }}
                        <span class="arrow">{{ showMap[e.id] ? '▲' : '▼' }}</span>
                    </p>

                    <div class="reply-list" v-if="showMap[e.id] && e.replies && e.replies.length">
                        <comment-reply 
                            v-for="r in e.replies" 
                            :key="r.id" 
                            :comment="r" 
                            :parent-name="e.name || '匿名'"
                            :portrait="portrait"
                            :date-one="dateOne"
                            :is-login="isLogin"
                            @reply="openReply"
                        >
                            <template #default="{ node }">
                                <div class="reply-form" v-if="replyToId === node.id">
                                    <div class="reply-tip">回复 <span class="at">@{{ replyToName }}</span></div>
                                    <textarea class="message" placeholder="请输入回复..." v-model="replyText"></textarea>
                                    <div class="bt">
                                        <input type="text" class="name" placeholder="签名" v-model="replyName">
                                        <YkButton :class="{notallowed: !canReply}" @click="submitReply">提交</YkButton>
                                        <YkButton class="cancel" @click="cancelReply">取消</YkButton>
                                    </div>
                                </div>
                            </template>
                        </comment-reply>
                    </div>
                </div>
            </div>

        </div>
        <p class="more" @click="getComment" v-show="nowpage>0">加载更多</p>
    </div>
</template>

<script>
import NoteCard from './NoteCard.vue';
import YkButton from './YkButton.vue';
import {portrait} from '@/utils/data.js'
import { dateOne } from '@/utils/yksg.js';
import { insertCommentApi, findCommentPagApi, replyApi } from "@/api/index.js";
import { isLoggedIn, requireLogin } from '@/utils/auth.js';
import CommentReply from './CommentReply.vue';
// import { comment } from 'mock/index.js';
export default {
   data(){
    return{
        comments:[],
        portrait,
        dateOne,
        discuss:'',     //输入的内容
        name:'匿名',    //用户名
        nowpage:1,      //当前页，从第1页开始加载
        pagesize:8,    //一页多少条
        // 回复相关
        replyToId: null,    // 当前回复的目标评论 id
        replyToName: '',    // 被回复人的名字
        replyText: '',      // 回复内容
        replyName: '匿名',  // 回复者签名
        showMap: {},        // 顶层评论的嵌套回复是否展开 { id: true/false }
    }
   },
   computed:{
    isDis(){
        return !!this.discuss;
    },
    // 回复提交按钮是否可用
    canReply(){
        return !!this.replyText;
    },
    // 是否已登录：token 存在且 !== 'guest'
    isLogin(){
        return isLoggedIn();
    },
    // 把扁平评论整理成「父评论 + 嵌套回复」结构
    commentList(){
        const map = {};
        const list = [];
        // 先建索引
        this.comments.forEach(c => { map[c.id] = { ...c, replies: [] }; });
        // 再归类
        this.comments.forEach(c => {
            const node = map[c.id];
            if (c.parentId && map[c.parentId]) {
                map[c.parentId].replies.push(node);
            } else {
                list.push(node);
            }
        });
        // 按 id 倒序（与查询排序一致）
        list.sort((a, b) => b.id - a.id);
        return list;
    },
    // 当前卡片（props.card
    cards(){
        return this.card;
    },
    // 从 store 取游客IP，响应式更新
    user(){
        return this.$store.state.user || {};
    }
   },
   props:{
    card:{
        default:{},
    }
   },
   components:{
    NoteCard,
    YkButton,
    CommentReply
   },
    methods:{
        // 切换顶层评论的嵌套回复展开/折叠
        toggleReplies(id){
            this.showMap = { ...this.showMap, [id]: !this.showMap[id] };
        },
        // 递归计算一条评论下所有子孙回复总数
        getReplyCount(comment){
            let count = (comment.replies || []).length;
            (comment.replies || []).forEach(r => { count += this.getReplyCount(r); });
            return count;
        },
        //提交评论（游客先弹登录）
        submit(){
            if (!requireLogin()) return
            if (this.isDis){
                //如果有用户就用头像，没有就用随机头像
                let img = Math.floor(Math.random() * 14);
                let data = {
                    wallId: this.card.id,
                    userId: this.user.id,
                    imgurl: img,
                    moment: new Date(),
                    name: this.name ? this.name.trim() : '',
                    comment: this.discuss,
                };
                console.log(data);
                insertCommentApi(data).then((res) => {
                    if(res.code !== 200){
                        alert(res.message || '评论失败');
                        return;
                    }
                    //刷新评论列表
                    this.refreshComments();
                    //通知父组件更新该卡片的评论数
                    this.$emit('commentAdded');
                    //清空评论框
                    this.discuss = '';
                }).catch(()=>{
                    alert('评论失败，请稍后再试');
                })
            }
        },
        //展开回复输入框
        openReply(comment){
            this.replyToId = comment.id;
            this.replyToName = comment.name || '匿名';
            this.replyText = '';
            this.replyName = this.user.username || this.name || '匿名';
        },
        //取消回复
        cancelReply(){
            this.replyToId = null;
            this.replyText = '';
        },
        //提交回复
        submitReply(){
            if (!this.canReply) return;
            let img = Math.floor(Math.random() * 14);
            const data = {
                wallId: this.card.id,
                parentId: this.replyToId,
                comment: this.replyText,
                name: this.replyName ? this.replyName.trim() : '',
                imgurl: img,
            };
            replyApi(data).then((res) => {
                if(res.code !== 200){
                    alert(res.msg || '回复失败');
                    return;
                }
                //刷新评论列表
                this.refreshComments();
                this.cancelReply();
            }).catch(()=>{
                alert('回复失败，请稍后再试');
            })
        },
        //刷新评论列表（从第一页重新拉取）
        refreshComments(){
            this.nowpage = 1;
            this.comments = [];
            this.getComment();
        },
        //获取评论
        getComment(){
            if (this.nowpage > 0) {
                let data = {
                    id: this.card.id,
                    page: this.nowpage,
                    pagesize: this.pagesize,
                }
                console.log(data);

                findCommentPagApi(data).then((res) => {
                    const list = res.message || [];
                    this.comments = this.comments.concat(list);
                    //设置下一次的page
                    if (list.length == this.pagesize) {
                        this.nowpage++;
                    }else{
                        this.nowpage = 0;
                    }
                })
            }
        },
    },
    mounted(){
        this.getComment();
    },
    watch:{
        card(){
            //卡片发生变化
            this.nowpage = 1;
            this.comments = [];
            this.cancelReply();
            this.getComment();
        }
    }
}
</script>

<style lang="less" scoped>
.card-detail{
    position: relative;
    padding:0 @padding-20 ;
    .top-bt{
        position: fixed;
        top:0;
        left: 0;
        padding: @padding-20;
        display: flex;
        .revoke{
            color: @primary-color;
            cursor: pointer;
            padding-right: 30px;
            font-size:@size-16 ; 
        }
        .report{
            font-size: @size-16;
            color:@warning-color;
            cursor: pointer;
        }
    }
    .form{
          .message {
            background: none;
            height: 56px;
            border:1px solid rgba(148,148,148,1);
            resize: none;
            padding: @padding-8;
            box-sizing: border-box;
            width: 100%;
            font-family: fa;
        }
        .bt{
            display: flex;
            padding-top: 6px;
            justify-content: space-between;

        }

        .name {
            width: 100%;
            box-sizing: border-box;
            padding: 7px;
            background: none;
            border:1px solid rgba(148,148,148,1);
            line-height: 20px;
            font-family: fa;

        }
    }
    .title{
        font-weight: 600;
        padding-top: 30px;
    }
    .more{
        color: @gray-3;
        text-align: center;
        padding-top: 20px;
        cursor:pointer ;
    }
    .commont-li{
        display: flex;
        padding-bottom: 30px;
        .user-head{
            flex:none;
            width:28px;
            height: 28px;
            border-radius: 20px;
            overflow: hidden;
            // background-image: linear-gradient(180deg,rgba(245,65,65,0.50) 0%,#F43F3f);
        }
        .comm-m{
            padding-left:@padding-8;
        }
        .m-top{
            display: flex;
            .name{
                font-weight: 600;
                align-items: center;
            }
            .time{
                font-size: @size-12;
                padding-left: @padding-4;
                color:@gray-3;
            }
        }
        .mm{
           padding: @padding-4; 
        }
        .reply-bt{
            display: inline-block;
            color: @primary-color;
            font-size: @size-12;
            cursor: pointer;
            padding: @padding-4 0;
        }
        .toggle-replies{
            color: @gray-3;
            font-size: @size-12;
            cursor: pointer;
            padding: @padding-4 0;
            .arrow{
                margin-left: 4px;
                font-size: 10px;
            }
            &:hover{
                color: @primary-color;
            }
        }
    }
    // 嵌套回复列表
    .reply-list{
        margin-top: @padding-8;
        padding-left: 20px;
        .reply-li{
            padding-bottom: @padding-8;
            .reply-to{
                color: @gray-3;
                font-size: @size-12;
                padding-left: @padding-4;
            }
        }
    }
    // 回复输入框
    .reply-form{
        margin: @padding-8 0;
        padding: 12px;
        background: rgba(245,246,248,0.9);
        border: 1px solid rgba(148,148,148,0.15);
        border-radius: 8px;
        .reply-tip{
            font-size: @size-12;
            color: @gray-3;
            padding-bottom: @padding-8;
            .at{
                color: @primary-color;
                font-weight: 600;
            }
        }
        .message{
            width: 100%;
            height: 60px;
            box-sizing: border-box;
            padding: @padding-8;
            background: @gray-10;
            border: 1px solid rgba(148,148,148,0.3);
            border-radius: 6px;
            resize: none;
            font-family: fa;
            outline: none;
            transition: border-color 0.2s;
            &:focus{
                border-color: @primary-color;
            }
            &::placeholder{
                color: #bbb;
            }
        }
        .bt{
            display: flex;
            align-items: center;
            padding-top: @padding-8;
            .name{
                width: 120px;
                box-sizing: border-box;
                padding: 6px 10px;
                background: @gray-10;
                border: 1px solid rgba(148,148,148,0.3);
                border-radius: 6px;
                line-height: 20px;
                font-size: @size-12;
                font-family: fa;
                outline: none;
                transition: border-color 0.2s;
                margin-right: auto;
                &:focus{
                    border-color: @primary-color;
                }
            }
            .cancel{
                margin-left: @padding-8;
                background: none;
                color: @gray-3;
            }
        }
    }
}
</style>