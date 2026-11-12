-- 1.用户表 user
CREATE TABLE IF NOT EXISTS user(
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL COMMENT '用户名',
  password VARCHAR(100) NOT NULL COMMENT '密码',
  imgurl VARCHAR(100) COMMENT '头像路径',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2.标签表 label
CREATE TABLE IF NOT EXISTS label(
  id INT NOT NULL AUTO_INCREMENT,
  label_name VARCHAR(50) NOT NULL COMMENT '标签名称',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3.留言主表 walls
CREATE TABLE IF NOT EXISTS walls(
 id INT NOT NULL AUTO_INCREMENT,
 type INT NOT NULL COMMENT '类型0信息1图片',
 message VARCHAR(1000) COMMENT '留言文字',
 userId INT NOT NULL COMMENT '创建者用户id，关联user.id',
 moment VARCHAR(100) NOT NULL COMMENT '时间字符串',
 label INT NOT NULL COMMENT '标签id，关联label.id',
 color INT COMMENT '卡片颜色编号',
 imgurl VARCHAR(100) COMMENT '图片路径',
 PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='留言墙';

-- 4.反馈表 feedbacks 点赞、举报、撤销
CREATE TABLE IF NOT EXISTS feedbacks(
 id INT NOT NULL AUTO_INCREMENT,
 wallId INT NOT NULL COMMENT '关联walls留言id',
 userId INT NOT NULL COMMENT '操作者用户id',
 type INT NOT NULL COMMENT '0喜欢，1举报，2撤销点赞',
 moment VARCHAR(100) NOT NULL COMMENT '时间字符串',
 PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞举报';

-- 5.评论表 comments
CREATE TABLE IF NOT EXISTS comments(
 id INT NOT NULL AUTO_INCREMENT,
 wallId INT NOT NULL COMMENT '关联walls留言id',
 userId INT NOT NULL COMMENT '评论者用户id',
 imgurl VARCHAR(100) COMMENT '头像路径',
 comment VARCHAR(1000) COMMENT '评论内容',
 name VARCHAR(100) NULL COMMENT '评论者签名',
 moment VARCHAR(100) NOT NULL COMMENT '时间字符串',
 PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='留言评论';

-- 插入一条测试用户
INSERT INTO user(username,password,imgurl) VALUES ('小明','123456','');

ALTER TABLE walls MODIFY COLUMN userId VARCHAR(50) NULL COMMENT '登录用户存数字id字符串，游客存IP地址';

INSERT INTO user (id,username, password, imgurl)
VALUES (3,'test01', '123456', '');

--点赞表 feedbacks
ALTER TABLE feedbacks MODIFY COLUMN userId VARCHAR(60) NOT NULL COMMENT '登录存用户id字符串，游客存IP地址';

--评论表 comments，评论者id
ALTER TABLE comments MODIFY COLUMN userId VARCHAR(60) NOT NULL COMMENT '登录存用户id字符串，游客存IP地址';

ALTER TABLE label ADD COLUMN type TINYINT DEFAULT 0 COMMENT '0第一组标签，1第二组标签';
INSERT INTO label(label_name,type) VALUES ('留言',0),('目标',0),('理想',0),
('过去',0),('将来',0),('爱情',0),('友情',0),('密码',0),('信条',0),('无题',0),
('我',1),('ta',1),('喜欢的',1),('有意义的',1),('值得纪念的',1),
('学校',1),('生活',1),('天空',1),('我在的城市',1),('大海',1);

ALTER TABLE comments ADD COLUMN parentId INT DEFAULT NULL COMMENT '回复的父评论id，NULL表示直接评论卡片';

<!-- 消息通知表 -->
CREATE TABLE IF NOT EXISTS message(
  id INT NOT NULL AUTO_INCREMENT,
  userId VARCHAR(60) NOT NULL COMMENT '接收者：登录存用户id字符串，游客存IP',
  type TINYINT NOT NULL COMMENT '1点赞 2评论 3回复',
  wallId INT DEFAULT NULL COMMENT '关联walls.id',
  commentId INT DEFAULT NULL COMMENT '关联comments.id',
  fromUserId VARCHAR(60) NOT NULL COMMENT '来源用户id',
  fromName VARCHAR(100) DEFAULT NULL COMMENT '来源用户名签名快照',
  content VARCHAR(255) DEFAULT NULL COMMENT '消息内容摘要',
  isRead TINYINT DEFAULT 0 COMMENT '0未读 1已读',
  moment VARCHAR(100) NOT NULL COMMENT '时间字符串',
  PRIMARY KEY (id),
  KEY idx_user (userId),
  KEY idx_read (isRead)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息通知';

ALTER TABLE comments ADD COLUMN name VARCHAR(100) NULL COMMENT '评论者签名';
ALTER TABLE walls ADD COLUMN name VARCHAR(100) NULL COMMENT '发布者签名快照';