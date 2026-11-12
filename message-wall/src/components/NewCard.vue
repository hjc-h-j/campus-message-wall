<template>
    <div class="new-card">
        <div class="colors" v-show="id == 0">
            <p class="color-li" v-for="(e, index) in cardColor1" :key="index" :style="{ background: e }"
                :class="{ colorselected: index == colorSelected }" @click="changColor(index)"></p>
        </div>
         <!-- 照片 -->
        <div class="add-photo" v-if="id == 1">
            <input type="file" name="file" id="file" multiple="multiple" @change="showPhoto">
            <div class="add-bt" v-if="url == ''">
                <span class="iconfont icon-tianjia"></span>
            </div>
            <div class="chang-bt" v-if="url != ''">
                <span class="iconfont icon-xiugai"></span>
            </div>
            <div class="photo-div"><img :src="url"></div>
        </div>
        <!-- 卡片 -->
        <div class="card-main" :style="{ background: id == 0 ? cardColor[colorSelected] : cardColor[5] }">
            <textarea placeholder="留言。。。" class="message" maxlength="500" v-model="message"></textarea>
            <input type="text" placeholder="签名" class="name" v-model="name">
        </div>
        <div class="labels">
            <p class="title">选择标签</p>
            <div class="label">
                <p v-for="l in labelOptions" :key="l.id" class="label-li"
                    :class="{ labelselected: l.id == selectedLabelId }" @click="changLabel(l.id)">{{ l.label_name }}</p>
            </div>
        </div>
        <div data-v-7dbc48d7="">
            <p class="title" >免责声明</p>
            <p class="mzsm" > 一刻时光是本人独自开发的，为便于与用户交流的留言平台。请不要利用此平台服务制作、上传、下载、复制、发布、传播或者转载如下内容：<br> 
                1、反对宪法所确定的基本原则的；<br> 
                2、危害国家安全，泄露国家秘密，颠覆国家政权，破坏国家 统一的；<br  >
                    3、损害国家荣誉和利益的； <br >
                    4、煽动民族仇恨、民族歧视，破坏民族团结的；<br>
                     5、破坏国家宗教政策，宣扬邪教和封建迷信的；<br > 
                    6、散布谣言，扰乱社会秩序，破坏社会稳定的；<br > 
                    7、散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的；<br > 
                    8、侮辱或者诽谤他人，侵害他人合法权益的；<br>
                     9、含有法律、行政法规禁止的其他内容的信息。 </p>
        </div>
        <div class="footbt">
            <yk-button-vue size="max" nom="secondary" @click="colseModal(0)">丢弃</yk-button-vue>
            <yk-button-vue size="max" class="submit"  @click="submit()">确定</yk-button-vue>
        </div>
    </div>
</template>
<script>
import { cardColor, cardColor1 } from "@/utils/data";
import YkButtonVue from "./YkButton.vue";
import {getObjectURL} from "@/utils/yksg.js";
import { insertWallApi,profileApi} from "@/api/index.js";
import { getUserInfo } from '@/utils/auth.js';
export default {
    data() {
        return {
            cardColor,
            cardColor1,
            colorSelected: 0,   //当前选择颜色
            labelSelected: null,//当前选择标签的真实id（label表id）
            message:'',         //留言信息
            name:'',            //签名
            url:'',
        }
    },

    props: {
        //当前在留言墙或照片墙
        id: {
            default: 0,
        }
    },

    components: {
        YkButtonVue,
    },

    computed: {
        // 从 store 取游客IP，响应式更新
        user() {
            return this.$store.state.user || {};
        },
        // 当前墙类型对应的标签列表（来自后端 label 表）
        labelOptions() {
            return this.$store.getters.labelsByType(Number(this.id));
        },
        // 实际生效的标签id：选中有效用选中值，否则默认该类型第一个
        selectedLabelId() {
            if (this.labelSelected != null &&
                this.labelOptions.some(l => l.id === this.labelSelected)) {
                return this.labelSelected;
            }
            return this.labelOptions.length ? this.labelOptions[0].id : null;
        }
    },

    methods: {
        //点击切换颜色
        changColor(e) {
            this.colorSelected = e;
        },

        //点击切换标签，参数为 label 表真实 id
        changLabel(id) {
            this.labelSelected = id;
        },

        //关闭窗口
        colseModal(data) {
            this.$emit('addClose', data);
        },

        submit(){
            // 签名处理：填了就用填的，没填空串
            let name = this.name ? this.name.trim() : '';
            let data={
                type:Number(this.id),
                message:this.message,
                name:name,
                userId: this.user.id,
                moment:new Date(),
                label:this.selectedLabelId,
                color:5,
                imgurl:'',
            };
            if(this.message&&this.id==0){
                data.color=this.colorSelected,
                insertWallApi(data).then((res)=>{
                //  console.log(res);
                // cardD.name：空串时用登录用户名兜底
                const displayName = name || (getUserInfo() && getUserInfo().username) || '匿名';
                let cardD={
                    type:Number(this.id),
                    message:this.message,
                    name: displayName,
                    userId: this.user.id,
                    moment:new Date(),
                    label:this.selectedLabelId,
                    color:this.colorSelected,
                    imgurl:'',
                    id: res.message.insertId,   //后端返回 {code,message:{insertId}}
                    islike: 0,
                    like: 0,
                    comcount: 0,
                    report: 0,
                    revoke: 0
                }
                this.$emit("clickbt",cardD);
                this.message="";
                this.$message({type:'success',message:'感谢你的记录!'});
            }).catch(()=>{
                this.$message({type:'error',message:'发布失败，请稍后再试'});
            });
         }else if(this.id==1 && this.url){
            this.updatePhoto(data);
         }
    },

        //图片显示
        showPhoto() {
            let aa = getObjectURL(document.getElementById("file").files[0]);
            this.url = aa;
        },

        //图片提交，data 由 submit 传入
        updatePhoto(data){
            let file=document.getElementById('file');
            if(file.files.length>0){
                let formData=new FormData();
                formData.append('file',file.files[0]);

                // 图片提交后端，返回图片路径字符串，如 /photo/123456.jpg
                profileApi(formData).then((res)=>{
                    // console.log(res);
                    data.imgurl=res
                    // 数据存储数据库
                     insertWallApi(data).then((result)=>{
                const photoName = data.name || (getUserInfo() && getUserInfo().username) || '匿名';
                let cardD={
                    type:Number(this.id),
                    message:this.message,
                    name:photoName,
                    userId: this.user.id,
                    moment:new Date(),
                    label:this.selectedLabelId,
                    color:5,
                    imgurl:res,
                    id: result.message.insertId,
                    islike: 0,
                    like: 0,
                    comcount: 0,
                    report: 0,
                    revoke: 0
                }
                this.$emit("clickbt",cardD);
                this.message="";
                this.url="";
                file.value="";   //清空文件选择，便于再次发布
                this.$message({type:'success',message:'感谢你的记录!'});
                }).catch(()=>{
                    this.$message({type:'error',message:'发布失败，请稍后再试'});
                });
             }).catch(()=>{
                this.$message({type:'error',message:'图片上传失败，请稍后再试'});
             })
            }
        },



        // // 接口测试使用
        // apiTest(){
        //     let data={
                
        //     }
        //     this.axios
        //     .post("http://localhost:3000/insertwall",data)
        //     .then((res)=>{
        //         console.log(res);
                
        //     })
        // }
      
    }
}
</script>
<style lang='less' scoped>
.new-card {
    padding: 0 @padding-20 120px;
    position: relative;

    .colors {
        padding-bottom: @padding-12;
        display: flex;
        align-items: center;

        .color-li {
            width: 24px;
            height: 24px;
            margin-right: @padding-8;
            cursor: pointer;

        }

        .colorselected {
            border: 1px solid @primary-color;
        }
    }

    .card-main {
        width: 100%;
        height: 240px;
        padding: 12px;
        box-sizing: border-box;
        transition: @tr;


        .message {
            background: none;
            border: none;
            resize: none;
            padding: @padding-8;
            box-sizing: border-box;
            height: 172px;
            width: 100%;
            font-family: fa;
            font-size: 16px;
        }

        .name {
            width: 100%;
            box-sizing: border-box;
            padding: @padding-8;
            background: none;
            border: #fff 1px solid;
            line-height: 20px;
            font-family: fa;
            font-size: 16px;

        }
    }

    .title {
        color: @gray-1;
        font-weight: 600;
        padding-top: 30px;
    }

    .label {
        display: flex;
        flex-wrap: wrap;
        // border: 1px solid red;
        width: 320px;

        .label-li {
            padding: 2px 10px;
            border-radius: 20px;
            margin: 16px @padding-4 0 0;
            cursor: pointer;
            color: @gray-2;
            transition: @tr;
        }

        .labelselected {
            background: #ebebeb;
            font-weight: 600;
            color: @gray-1;

        }
    }

    .mzsm {
        padding-top: 10px;
        font-size: 12px;
        color: @gray-3;
    }

    .add-photo {
        padding-bottom: 20px;
        position: relative;

        #file {
            position: absolute;
            z-index: 10;
            top: -10;
            height: 74px;
            width: 64px;
            opacity: 0;
            cursor: pointer;
        }

        .add-bt {
            width: 64px;
            height: 64px;
            border: 1px solid @gray-3;
            border-radius: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .photo-div {
            max-height: 200px;
            width: 100%;
            background: #f0f0f0;
            overflow: hidden;
            display: flex;
            align-items: center;

            img {
                width: 100%;
            }
        }

        .chang-bt {
            position: absolute;
            top: 12px;
            left: 12px;
            height: 40px;
            width: 40px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;

            .icon-xiugai {
                color: #fff;
            }
        }
    }

    .footbt {
        padding: @padding-20;
        box-sizing: border-box;
        position: fixed;
        bottom: 52px;
        left: 0;
        background: rgba(255, 255, 255, 0.6);
        width: 100%;
        backdrop-filter: blur(10px);

        .submit {
            margin-left: @padding-20;
            width: 200px;
        }
    }
}
</style>