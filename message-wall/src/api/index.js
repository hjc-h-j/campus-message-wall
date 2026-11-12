import fetch from '@/utils/axios'

//获取访问者ip
export const signIpApi = () => fetch.post('/signip');

//登录
export const loginApi = data => fetch.post('/api/login', data);

//注册
export const registerApi = data => fetch.post('/api/register', data);

//新建wall
export const insertWallApi = data => fetch.post('/insertwall', data);

//查询墙
export const findWallPageApi = data => fetch.post('/findwallpage', data);

//反馈
export const insertFeedbackApi = data => fetch.post('/insertfeedback', data);

//评论
export const insertCommentApi = data => fetch.post('/insertcomment', data);

//回复评论
export const replyApi = data => fetch.post('/api/reply', data);

//获取评论
export const findCommentPagApi = data => fetch.post('/findcommentpage', data);

//获取标签列表（不传type返回全部，传0留言墙/1照片墙）
export const findLabelApi = data => fetch.post('/findlabel', data);

//上传图片
export const profileApi = data => fetch.post('/profile', data);

//删除墙
export const deleteWallApi = data => fetch.post('/deletewall', data);

//删除反馈
export const daleteFeedbackApi = data => fetch.post('/daletefeedback', data);

//删除评论
export const deleteCommentApi = data => fetch.post('/deletecomment', data);

//后台仪表盘统计（需管理员身份）
export const getDashboardApi = () => fetch.get('/api/admin/dashboard');

//后台卡片分页列表（需管理员身份，params: {page, pagesize, type}）
export const getAdminWallsApi = params => fetch.get('/api/admin/walls', { params });

//后台编辑卡片（需管理员身份，data: {message, label, color}）
export const updateAdminWallApi = (id, data) => fetch.put(`/api/admin/wall/${id}`, data);

//后台删除卡片（需管理员身份）
export const deleteAdminWallApi = id => fetch.delete(`/api/admin/wall/${id}`);

//后台标签列表（需管理员身份）
export const getAdminTagsApi = () => fetch.get('/api/admin/tags');

//后台新增标签（需管理员身份，data: {label_name, type}）
export const addAdminTagApi = data => fetch.post('/api/admin/tag', data);

//后台编辑标签（需管理员身份，data: {label_name, type}）
export const updateAdminTagApi = (id, data) => fetch.put(`/api/admin/tag/${id}`, data);

//后台删除标签（需管理员身份）
export const deleteAdminTagApi = id => fetch.delete(`/api/admin/tag/${id}`);

//后台用户分页列表（需管理员身份，params: {page, pagesize}）
export const getAdminUsersApi = params => fetch.get('/api/admin/users', { params });

//后台评论分页列表（需管理员身份，params: {page, pagesize}）
export const getAdminCommentsApi = params => fetch.get('/api/admin/comments', { params });

//后台删除评论（需管理员身份）
export const deleteAdminCommentApi = id => fetch.delete(`/api/admin/comment/${id}`);

//个人空间-当前用户信息
export const getUserInfoApi = () => fetch.get('/api/user/info');

//个人空间-我的留言（params: {page, pagesize}）
export const getUserWallsApi = params => fetch.get('/api/user/walls', { params });

//个人空间-删除本人留言
export const deleteMyWallApi = id => fetch.delete(`/api/user/wall/${id}`);

//个人空间-我的评论（params: {page, pagesize}）
export const getUserCommentsApi = params => fetch.get('/api/user/comments', { params });

//个人空间-我的消息（params: {page, pagesize}）
export const getUserMessagesApi = params => fetch.get('/api/user/messages', { params });

//个人空间-未读消息数
export const getUnreadCountApi = () => fetch.get('/api/user/messages/unread');

//个人空间-标记消息已读
export const readMessageApi = id => fetch.put(`/api/user/message/${id}/read`);

//个人空间-修改头像（data: {imgurl: 序号0-13}）
export const updateAvatarApi = data => fetch.put('/api/user/avatar', data);

// 修改密码（原密码 + 新密码）
export const updatePasswordApi = data => fetch.put('/api/user/password', data);
