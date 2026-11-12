import { baseUrl } from "./env";

import axios from "axios";

const service = axios.create({
    // process.env.NODE_ENV === 'development'来判断是否开发环境
    // easy-mock服务挂了，暂时不使用了 
    baseURL: baseUrl,
    timeout: 5000
});

// 添加请求拦截器
service.interceptors.request.use(

    // 在发送请求之前做些什么
    config => {
        // 自动带上登录 token：后端 tokenVerify 解析 Bearer 令牌
        // 无 token 时不加该头，游客接口照常可访问
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config;
    },

    // 对请求错误做些什么 
    error => {
        console.log(error);
        return Promise.reject(error);
    });


// 添加响应拦截器
service.interceptors.response.use(
    // 对响应数据做点什么 
    response => {
        if (response.status === 200) {
            return response.data;
        } else {
            return Promise.reject(new Error(`响应状态异常：${response.status}`));
        }
    },
    //对响应错误做点什么 
    error => {
        console.log(error);
        return Promise.reject(error);
    }
);

export default service;