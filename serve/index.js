const express = require('express')
const path = require('path')
const cors = require('cors')

// 解析html
// var ejs = require('ejs');
var config = require('./config/default');

const app = express()

// 获取静态路径
// CORS 必须在静态文件之前注册，否则图片响应不会带 Access-Control-Allow-Origin，
// 前端 el-image 预览（fetch/XHR 加载）会被浏览器的 ORB 机制拦截
app.use(cors())
app.use(express.static(__dirname + '/dist'));
app.use(express.static(__dirname + '/data'));

// 加入html试图
// app.engine('html', ejs.__express);
// app.set('view engine', 'html');

// 解析前端数据
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 引入路由
require('./routes/index')(app);
require('./routes/files')(app);

app.listen(config.port, () => {
    console.log(`我启动了端口${config.port}`);
})