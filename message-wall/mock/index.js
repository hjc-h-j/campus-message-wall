// 引入mock
let Mock = require('mockjs')

export const note = Mock.mock({
    "data|19": [{
        //创建时间
        "moment": new Date(),
        //id
        "id|+1": 1,
        //userid
        "userId|+1": 10,
        //内容
        "message|24-96": "@cword",
        //label
        "label|0-10": 0,
        //name
        "name": "@cname",
        //like
        "like|0-120": 0,
        //评论
        "comment|0-120": 0,
        //背景色
        "imgurl|0-4": 0,
        //是否撤销
        "revoke|0-20": 0,
        //是否举报
        "report|0-20": 0,
        //类型
        "type": 0,
    }]
})


// 图片photo
export const photo = Mock.mock({
    "data|19": [{
        //创建时间
        "moment": new Date(),
        //id
        "id|+1": 1,
        //userid
        "userId|+1": 10,
        //内容
        "message|24-96": "@cword",
        //label
        "label|0-10": 0,
        //name
        "name": "@cname",
        //like
        "like|0-120": 0,
        //评论
        "comment|0-120": 0,
        //背景色
        "imgurl|0-5": 0,
        //是否撤销
        "revoke|0-20": 0,
        //是否举报
        "report|0-20": 0,
        //类型
        "type": 0,
    }]
})

// 评论
export const comment = Mock.mock({
    "data|19": [{
        //创建时间
        "moment": new Date(),
        //id
        "id|+1": 1,
        //userid
        "userId|+1": 10,
        //内容
        "message|24-96": "@cword",
        //name
        "name": "@cname",
        //背景色
        "imgurl|0-13": 0,
    }]
})

//头像背景
export const portrait = [
    'linear-gradient(180deg,#FFA9D9 0%,#E83D3D 100%)',
    'linear-gradient(180deg,#FFA7EB 0%,#F026A8 100%)',
    'Linear-gradient(180deg,#F5A8FF 0%,#BF23E5 100%)',
    'linear-gradient(180deg,#DFA1FF 0%,#9A36F0 100%)',
    'linear-gradient(180deg,#C9AAFF 0%,#6D3CF5 100%)',
    'linear-gradient(180deg,#9EAAFF 0%,#3846F4 100%)',
    'linear-gradient(180deg,#8CD8FF 0%,#2A6AF0 100%)',
    'linear-gradient(180deg,#7BE7FF 2%,#1E85E2 100%)',
    'linear-gradient(180deg,#92FDFF 0%,#14B2DD 100%)',
    'linear-gradient(180deg,#89FED8 0%,#18C997 100%)',
    'linear-gradient(180deg,#D7FFA7 0%,#5ED52A 100%)',
    'linear-gradient(180deg,#FFED48 0%,#FD9E16 100%)',
    'linear-gradient(180deg,#FFDC83 0%,#F88816 100%)',
    'linear-gradient(180deg,#FFBA8D 1%,#EB6423 100%)',
];