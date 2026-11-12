const config = {
    // 启动端口号
    port: 3000,
    // JWT 密钥，演示用；实际生产请改为从环境变量 process.env.JWT_SECRET 读取
    jwtSecret: 'your_jwt_secret_change_me',
    database: {
        HOST: 'localhost',
        PORT: 3306, // mysql默认端口
        USER: 'root',
        PASSWORD: '123456',
        DATABASE: 'wall_db' // 你的数据库名，自己Navicat新建这个库
    }

}

module.exports = config;