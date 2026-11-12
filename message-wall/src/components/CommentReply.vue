<template>
    <div class="commont-li reply-li">
        <div class="user-head" :style="{backgroundImage: portrait[comment.imgurl] || portrait[0]}"></div>
        <div class="comm-m">
            <div class="m-top">
                <p class="name">{{ comment.name || '匿名' }}</p>
                <span class="reply-to">回复 @{{ parentName || '匿名' }}</span>
                <p class="time">{{ dateOne(comment.moment) }}</p>
            </div>
            <div class="mm">{{ comment.comment }}</div>
            <p class="reply-bt" v-if="isLogin" @click="$emit('reply', comment)">回复</p>
            <!-- 父组件插槽：把回复输入框渲染在当前这条回复下面 -->
            <slot :node="comment"></slot>
            <!-- 递归：自己的 replies 继续用 CommentReply 渲染 -->
            <div class="reply-list" v-if="comment.replies && comment.replies.length">
                <comment-reply
                    v-for="r in comment.replies"
                    :key="r.id"
                    :comment="r"
                    :parent-name="comment.name || '匿名'"
                    :portrait="portrait"
                    :date-one="dateOne"
                    :is-login="isLogin"
                    @reply="$emit('reply', $event)"
                >
                    <!-- 把插槽继续往下传，任意层级都能显示回复框 -->
                    <template #default="slotProps">
                        <slot v-bind="slotProps"></slot>
                    </template>
                </comment-reply>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'CommentReply',
    props: ['comment', 'parentName', 'portrait', 'dateOne', 'isLogin'],
}
</script>

<style lang="less" scoped>
.commont-li{
    display: flex;
    padding-bottom: 30px;
    .user-head{
        flex:none;
        width:28px;
        height: 28px;
        border-radius: 20px;
        overflow: hidden;
    }
    .comm-m{
        padding-left:8px;
    }
    .m-top{
        display: flex;
        .name{
            font-weight: 600;
            align-items: center;
        }
        .time{
            font-size: 12px;
            padding-left: 4px;
            color:#999;
        }
    }
    .mm{
        padding: 4px; 
    }
    .reply-bt{
        display: inline-block;
        color: #409EFF;
        font-size: 12px;
        cursor: pointer;
        padding: 4px 0;
    }
}
.reply-list{
    margin-top: 8px;
    .reply-li{
        padding-bottom: 8px;
        .reply-to{
            color: #999;
            font-size: 12px;
            padding-left: 4px;
        }
    }
}
</style>
