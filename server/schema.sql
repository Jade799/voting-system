DROP DATABASE IF EXISTS polling_system;
CREATE DATABASE polling_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE polling_system;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE COMMENT '账号',
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
  signature VARCHAR(200) DEFAULT '' COMMENT '个性签名',
  avatar MEDIUMTEXT COMMENT '头像 base64',
  bg_image MEDIUMTEXT COMMENT '背景图 base64',
  is_certified TINYINT(1) DEFAULT 0,
  company_name VARCHAR(100) DEFAULT '',
  real_name VARCHAR(50) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  algorithm ENUM('single','multiple','weighted','borda','scoring') NOT NULL,
  status ENUM('pending','active','ended') DEFAULT 'active',
  visibility ENUM('public','certified','enterprise') DEFAULT 'public',
  company_name VARCHAR(100) DEFAULT '',
  require_real_name TINYINT(1) DEFAULT 0,
  end_at DATETIME NOT NULL,
  total_votes INT DEFAULT 0,
  creator_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  label VARCHAR(100) NOT NULL,
  count_val DECIMAL(10,2) DEFAULT 0 COMMENT '票数/分数/权重',
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  poll_id INT NOT NULL,
  payload JSON NULL,
  is_anonymous TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_poll (user_id, poll_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (poll_id) REFERENCES polls(id)
);

CREATE TABLE official_enterprises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255) NOT NULL
);

CREATE TABLE enterprise_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  employee_name VARCHAR(50) NOT NULL,
  employee_no VARCHAR(50) DEFAULT '',
  username VARCHAR(100) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_company_employee (company_name, employee_name, username)
);

-- 演示账号：demo@vote.com / 123456
INSERT INTO users (username, password_hash, nickname, signature, is_certified, company_name, real_name)
VALUES
('demo@vote.com', 'df4a9422fe19965273f201b3ee5afd638e1795ac4b89a6572ab9cab08eec12e6', '演示用户', '让每一次选择都有依据', 1, 'Pledis', '尹净汉');

INSERT INTO official_enterprises (company_name, legal_name)
VALUES
('Pledis', '尹净汉'),
('Pledis', '洪知秀'),
('Pledis', '崔胜澈'),
('HYBE', '金敏智'),
('Acme Technology', '张三');

INSERT INTO enterprise_members (company_name, employee_name, employee_no, username)
VALUES
('Pledis', '尹净汉', 'P001', 'demo@vote.com'),
('Pledis', '洪知秀', 'P002', 'joshua@pledis.test'),
('Pledis', '崔胜澈', 'P003', 'scoups@pledis.test'),
('Pledis', '文俊辉', 'P004', 'jun@pledis.test'),
('Pledis', '权顺荣', 'P005', 'hoshi@pledis.test'),
('Pledis', '全圆佑', 'P006', 'wonwoo@pledis.test'),
('Pledis', '李知勋', 'P007', 'woozi@pledis.test'),
('Pledis', '李硕珉', 'P008', 'dk@pledis.test'),
('Pledis', '金珉奎', 'P009', 'mingyu@pledis.test'),
('Pledis', '徐明浩', 'P010', 'the8@pledis.test'),
('Pledis', '夫胜宽', 'P011', 'seungkwan@pledis.test'),
('Pledis', '崔韩率', 'P012', 'vernon@pledis.test'),
('Pledis', '李灿', 'P013', 'dino@pledis.test'),
('HYBE', '金敏智', 'H001', 'minji@hybe.test'),
('HYBE', '李惠仁', 'H002', 'hyein@hybe.test'),
('Acme Technology', '张三', 'A001', 'zhangsan@acme.test'),
('Acme Technology', '李四', 'A002', 'lisi@acme.test');

INSERT INTO polls (title, description, algorithm, status, visibility, company_name, end_at, total_votes, creator_id)
VALUES
('社区公共空间改造方案选择', '选择最适合社区长期维护的公共空间改造方案。', 'single', 'active', 'public', '', DATE_ADD(NOW(), INTERVAL 5 DAY), 3, 1),
('企业年度团建地点偏好', '仅 Pledis 企业认证成员可参与。', 'multiple', 'active', 'enterprise', 'Pledis', DATE_ADD(NOW(), INTERVAL 3 DAY), 2, 1),
('课程项目展示评分', '对候选项目进行 1-10 分评分。', 'scoring', 'active', 'public', '', DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 1);

INSERT INTO options (poll_id, label, count_val)
VALUES
(1, '方案 A：绿地与步道', 2),
(1, '方案 B：儿童活动区', 1),
(1, '方案 C：休闲座椅区', 0),
(2, '海边', 1),
(2, '山地民宿', 2),
(2, '城市剧本馆', 1),
(3, '智慧投票平台', 8.5),
(3, '校园二手交易平台', 7.0),
(3, '课程助手系统', 6.5);
