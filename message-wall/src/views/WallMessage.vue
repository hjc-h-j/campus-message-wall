<template>
    <div class="wall-message">
        <p class="title">{{wallType[Number(id)]?.name}}</p>
        <p class="slogan">{{wallType[Number(id)]?.slogan }}</p>
        <div class="label">
            <p class="label-list" :class="{lbselected:nlabel==-1}" @click="selectNode(-1)">全部</p>
            <p class="label-list" :class="{lbselected:nlabel==l.id}"  v-for="l in labelOptions" :key="l.id"  @click="selectNode(l.id)" >{{l.label_name}}</p>
        </div>
        <div class="card" :style="{width:nwidth+'px'}" v-show="id==0">
            <NodeCardvue v-for="(e,index) in cards" :key="e.id" :note="e" class="card-inner" :width="'288px'" :class="{cardSelected:index==cardSelected}" @toDetail="seletedcard(index)"></NodeCardvue>
        </div>
        <!-- 照片 -->
        <div class="photo" v-show="id==1">
            <PhotoCard :photo="e" class="photo-card" v-for="(e,index) in cards" :key="e.id" @toDetail="seletedcard(index)"></PhotoCard>
        </div>
        <!-- 卡片状态 -->
         <div class="none-msg" v-if="isok==0">
            <img :src="none[id].url" alt="">
            <p>{{ none[id].msg }}</p>
         </div>
         <div class="loading" v-show="isok==-1">
            <div id="lottile"></div>
            <p>加载中...</p>
         </div>
        <p class="bottom-tip" v-show="isok==2 && page==0">没有更多了</p>

        <div class="add" :style="{bottom:addBottom+'px'}" @click="addCard">
            <span class="iconfont icon-tianjia"></span>
        </div>
        <YkModal :title="title" @cloose="closeModal" :ismodal="modal">
            <NewCard :id="id" @addclose="closeModal" v-if="cardSelected==-1 " @clickbt="newcard"></NewCard>
            <CardDetail v-if="cardSelected!==-1" :card="cards[cardSelected]" @commentAdded="onCommentAdded"></CardDetail>
        </YkModal>
        <YkViewer :isView="view" :photos="photoArr" :nowNumber="cardSelected" @viewSwitch="viewSwitch"></YkViewer>
    </div>
</template>

<script>
import {wallType,none} from '@/utils/data'
import NodeCardvue from '@/components/NoteCard.vue';
import YkModal from '@/components/YkModal.vue';
import NewCard from '@/components/NewCard.vue';
import CardDetail from '@/components/CardDetail.vue';
import PhotoCard from '@/components/PhotoCard.vue';
import YkViewer from '@/components/YkViewer.vue';
import lottie from 'lottie-web';
import loading from '@/assets/images/loading.json';
// import { photo } from '../../mock/index';
import {findWallPageApi} from '@/api/index'
import {requireLogin} from '@/utils/auth.js'
export default {
  data(){
    return{
        wallType,
        none,
        // id:0, //留言墙和照片墙的切换id
        nlabel:-1, //当前筛选的标签真实id，-1代表全部
        cards:[],
        // photo:photo.data,
        photoArr:[],//图片列表
        nwidth:0, //卡片模块的宽度
        addBottom:30,//add按钮距离底部的距离
        title:'写留言',//新建标题
        modal:false,//是否调用弹窗
        view:false,//预览大图
        cardSelected:-1,//当前选择卡片
        isok:-1,    //是否加载中 -1,0为没有拿到
        page:1,    //当前页面
        pagesize:10,


    }
  },
   components:{
        NodeCardvue,
        YkModal,
        NewCard,
        CardDetail,
        PhotoCard,
        YkViewer,
    },
    computed:{
        id() {
            // 留言墙和照片墙的切换id
            return this.$route.query.id;
        },
        // 当前墙类型的标签列表（来自后端 label 表）
        labelOptions() {
            return this.$store.getters.labelsByType(Number(this.id));
        },
        user(){
            return this.$store.state.user;
        }
    },
    watch:{
        id(){
            this.modal=false;
            this.view=false;
            this.nlabel=-1;
            this.cardSelected=-1;
            // 切墙类型时必须清空旧数据并重新拉取，否则照片墙会显示旧文本卡片
            this.cards=[];
            this.photoArr=[];
            this.page=1;
            this.isok=-1;
            this.getWallCard(this.id)
        }
    },
   
   methods:{
        // 切换label
        selectNode(e){
            this.nlabel=e;
            // 清空当前数据
            this.cards=[];
            this.photoArr=[];
            this.page=1;
            this.isok=-1;   // 重置为加载中，避免旧状态残留
            this.getWallCard(this.id)
        },
        // note的宽度
        notewidth(){
            // 页面宽度
            let wwidth=document.body.clientWidth;
            this.nwidth=Math.floor((wwidth - 120) / 300) * 300
        },
        // 监听页面滚动
        scrollBottom(){
            // 已经滚动出去的高度
            let scrollTop=document.documentElement.scrollTop||document.body.scrollTop;
            // 当前可视窗口高度
            let clientHeight=document.documentElement.clientHeight;
            // 整个页面文档总高度
            let scrollHeight=document.documentElement.scrollHeight;
            if(scrollTop+clientHeight+230>=scrollHeight){
                this.addBottom=scrollTop+clientHeight+230-scrollHeight;
            }else{
                this.addBottom=30;
            }

            // 加载更多：触底阈值10px，防止小数精度导致精确相等永远不成立；正在加载时跳过避免重复请求
            if(this.page > 0 && this.isok !== -1 && scrollTop + clientHeight >= scrollHeight - 10){
                this.getWallCard(this.id);
            }
        },

        // 新建card（游客先弹登录）
        addCard(){
            if (!requireLogin()) return
            this.title="写留言"
            this.cardSelected=-1;
            this.view=false;
            this.modal=true;
        },

        // 切换弹窗打开与关闭
        closeModal(){
            this.modal=false;
            if(this.id==1){
             this.view=false;
            }
        },
        // 选择卡片
        seletedcard(e){
            this.title="";
            if(e!=this.cardSelected){   
                this.cardSelected=e;
                this.modal=true;
                if(this.id==1){
                    this.view=true;
                }
            }else{
                this.cardSelected=-1;
                this.modal=false;
                 if(this.id==1){
                    this.view=false;
                }
            }
        },
       
        // 切换图片
        viewSwitch(e){
            if(e==0){
                this.cardSelected--;
            }else{
                this.cardSelected++;
            }
        },
        // 前端插入卡片
        newcard(e){
            console.log(e);
            this.cards.unshift(e);
            //照片卡片同步进大图列表，保证索引一致
            if(this.id==1 && e.imgurl){
                this.photoArr.unshift(e.imgurl);
            }
            this.closeModal();
        },
        // 评论成功后更新当前卡片的评论数
        onCommentAdded(){
            const idx = this.cardSelected;
            if(this.cards[idx] != null){
                this.cards[idx].comcount = (Number(this.cards[idx].comcount) || 0) + 1;
            }
        },
        // 加载动画
        loading(){
            if(this.isok==-1){
                this.$nextTick(()=>{
                    try {
                      var params1={
                          container:document.getElementById("lottie"),
                          renderer:'svg',
                          loop:true,
                          autoplay:true,
                          animationData:loading,
                      };
                      lottie.loadAnimation(params1);
                    }catch(err){
                   console.error("lottie错误：", err);
                 }
               })
            }
        },
        // 获取卡片
        getWallCard(id){
            // 只有page>0才执行
            if(this.page>0){
                this.isok=-1;
                let data={
                    type:id,
                    page:this.page,
                    pagesize:this.pagesize,
                    userId:this.user.id,
                    label:this.nlabel,
                }
                // console.log(data);
                // 消息中心跳转定位：仅首次请求记录目标 wallId
                if(!this.locateTried){
                    let wid=this.$route.query.wallId;
                    if(wid){ this.locateWallId=Number(wid); }
                    this.locateTried=true;
                }
                // 记录本次请求对应的标签，避免并发切换时旧请求覆盖新状态
                let currentLabel=this.nlabel;
                findWallPageApi(data).then((res)=>{
                    // 如果请求返回时用户已切换到其他标签，丢弃本次结果
                    if(currentLabel!==this.nlabel) return;
                    this.cards=this.cards.concat(res.message);
                    // console.log(res.message);
                    if(res.message.length){
                        this.page++;
                    }else{this.page=0; this.isok=2;}
                    // page 与 isok 同步更新，避免 loading 与 bottom-tip 同显
                    if(this.cards.length>0){
                        this.isok=1;
                        if(this.page==0){
                            this.isok=2;
                        }
                    }else{
                        this.isok=0;
                    }

                    //如果为图片，photoArr 与 cards 全量同步，保证索引一致、不重复
                    if(this.id==1){
                        this.photoArr = this.cards.map(c => c.imgurl);
                    }

                    // 消息跳转：定位到指定卡片并自动打开详情
                    if(this.locateWallId){
                        let idx=this.cards.findIndex(c=>Number(c.id)===this.locateWallId);
                        if(idx>=0){
                            this.seletedcard(idx);
                            this.locateWallId=null;
                        }
                        // 本页未找到时等待下一页加载后继续尝试
                    }
                }).catch(err=>{
                    console.log('获取卡片失败：', err);
                    this.isok=0;   // 请求失败也解除 loading，避免卡死
                });
            }
        },
        getUser() {
            let timer = setInterval(() => {
             if (this.user) {
               clearInterval(timer);
               this.getWallCard(this.id);
             }
      }, 10)
    }

    },
   mounted(){
    this.notewidth();
    this.loading();
    this.getUser();
    // 兜底确保标签已加载（App.vue 已加载，action 内有缓存不会重复请求）
    this.$store.dispatch('loadLabels').catch(()=>{});

    // 监听屏幕宽度变化
    window.addEventListener('resize',this.notewidth);
    // 监听滚动高度变化
    window.addEventListener('scroll',this.scrollBottom);
   },
   unmounted(){
    // 监听屏幕宽度变化
    window.addEventListener('resize',this.notewidth);
    window.addEventListener('scroll',this.scrollBottom);
   }
}
</script>

<style lang="less" scoped>
.wall-message{
    min-height: 700px;
    padding-top: 52px;

    .title{
        padding-top: 48px;
        padding-bottom:8px;
        font-size: 56px;
        color:@gray-1;
        text-align: center;
        font-weight: 600;
    }
    .slogan{
        color:@gray-2;
        text-align: center;

    }
    .label{
        display: flex;
        justify-content: center;
        margin-top:40px;
        .label-list{
            padding: 0 14px;
            display: flex;
            align-items: center;
            line-height: 28px;
            height: 30px;
            margin: @padding-4;
            color: @gray-2;
            box-sizing: border-box;
            cursor: pointer;
        }
        .lbselected{ 
            color:@gray-2;
            font-weight: 600;
            border: 1px solid @gray-1;
            border-radius:14px ;
        }
    }
    .card{
        display: flex;
        flex-wrap: wrap;
        margin: auto;
        padding-top:28px;
        .card-inner{
            margin: 6px;
        }
        .cardSelected{
            border: 1px solid @primary-color;
        }
    }
     .photo{
            width:88%;
            margin: 0 auto;
            columns: 6;
            column-gap: @padding-4;
        }
        .photo-card{
            margin-bottom:@padding-4 ;
        }
    .add{
        width:56px;
        height: 56px;
        background: @gray-1;
        box-shadow:0px 4px 8px rgba(0,0,0,0.88) ;
        border-radius: 28px;
        position: fixed;
        right: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: @tr;
     
        .icon-tianjia{
            color:@gray-10;
            font-size: 24px;
        }
    }
    .none-msg{
        width:100%;
        text-align: center;
        padding-top: 80px;
        position: absolute;
        top: 300px;

     img{
        display: inline;
        height: 50px;
        width: 50px;
        background-size: 100%;
    }
    p{
        font-family: serif;
        font-weight: 700;
        font-size: 24px;
        color:@gray-3;
    }
    }
   
    .loading{
        text-align: center;
        width: 100%;
        p{
            margin-top: -30px;
            font-family: serif;
            font-size: 24px;
            color:@gray-3;
        }
    }
    #lottile{
        margin-top:20px;
        height: 200px;
    }
    
    .bottom-tip{
        text-align: center;
        color:@gray-3;
        padding:20px ;
    }
}
</style>