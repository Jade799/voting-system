'use strict';

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'voting_system_2026_secret';
const PORT = 3000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'hj0118',
  database: 'polling_system',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+08:00'
});

const hashPassword = (password) =>
  crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '请先登录' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
};

const ensureExtraColumns = async () => {
  const migrations = [
    "ALTER TABLE polls ADD COLUMN visibility ENUM('public','certified','enterprise') DEFAULT 'public' AFTER status",
    "ALTER TABLE polls ADD COLUMN company_name VARCHAR(100) DEFAULT '' AFTER visibility",
    "ALTER TABLE polls ADD COLUMN require_real_name TINYINT(1) DEFAULT 0 AFTER company_name",
    "ALTER TABLE votes ADD COLUMN payload JSON NULL AFTER poll_id",
    "ALTER TABLE votes ADD COLUMN is_anonymous TINYINT(1) DEFAULT 1 AFTER payload"
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.warn('迁移跳过:', err.message);
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enterprise_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_name VARCHAR(100) NOT NULL,
      employee_name VARCHAR(50) NOT NULL,
      employee_no VARCHAR(50) DEFAULT '',
      username VARCHAR(100) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_company_employee (company_name, employee_name, username)
    )
  `);
};

const getUserById = async (id) => {
  if (!id) return null;
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
};

const normalizeStatus = (row) => {
  if (row.status === 'active' && new Date(row.end_at).getTime() <= Date.now()) return 'ended';
  return row.status;
};

const formatPoll = (row, options = []) => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  algorithm: row.algorithm,
  status: normalizeStatus(row),
  visibility: row.visibility || 'public',
  companyName: row.company_name || '',
  requireRealName: !!row.require_real_name,
  createdAt: new Date(row.created_at).getTime(),
  endAt: new Date(row.end_at).getTime(),
  totalVotes: Number(row.total_votes || 0),
  creatorId: row.creator_id,
  creator: row.creator_name || '匿名用户',
  options: options.map((o) => ({
    id: o.id,
    label: o.label,
    count: Number(o.count_val || 0)
  }))
});

const getPollOptionsMap = async (pollIds) => {
  if (!pollIds.length) return {};
  const [rows] = await pool.query('SELECT * FROM options WHERE poll_id IN (?) ORDER BY id', [pollIds]);
  return rows.reduce((map, option) => {
    map[option.poll_id] = map[option.poll_id] || [];
    map[option.poll_id].push(option);
    return map;
  }, {});
};

const canUserVote = (poll, user) => {
  if ((poll.status || 'active') !== 'active') return { ok: false, reason: '投票已结束' };
  if (new Date(poll.end_at).getTime() <= Date.now()) return { ok: false, reason: '投票已结束' };
  if ((poll.visibility || 'public') === 'public') return { ok: true };
  if (!user) return { ok: false, reason: '请先登录后再参与该投票' };
  if (!user.is_certified) return { ok: false, reason: '该投票仅认证用户可参与' };
  if (poll.visibility === 'enterprise' && poll.company_name && poll.company_name !== user.company_name) {
    return { ok: false, reason: '该投票仅所属企业成员可参与' };
  }
  return { ok: true };
};

app.post('/api/register', async (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: '账号和密码不能为空' });
  }

  try {
    const [exist] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exist.length) return res.status(409).json({ error: '账号已存在，请直接登录' });

    const nick = nickname?.trim() || username.split('@')[0];
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
      [username, hashPassword(password), nick]
    );

    const user = { id: result.insertId, nickname: nick, isCertified: false };
    const token = jwt.sign({ id: result.insertId, nickname: nick }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: '注册失败', detail: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim()) return res.status(400).json({ error: '请填写账号和密码' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ error: '账号不存在' });
    const u = rows[0];
    if (u.password_hash !== hashPassword(password)) return res.status(401).json({ error: '密码错误' });

    const token = jwt.sign({ id: u.id, nickname: u.nickname }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true,
      token,
      user: {
        id: u.id,
        nickname: u.nickname,
        signature: u.signature,
        avatar: u.avatar,
        bgImage: u.bg_image,
        isCertified: !!u.is_certified,
        companyName: u.company_name,
        realName: u.real_name
      }
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败', detail: err.message });
  }
});

app.get('/api/user/profile', auth, async (req, res) => {
  const u = await getUserById(req.user.id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  res.json({
    id: u.id,
    nickname: u.nickname,
    signature: u.signature,
    avatar: u.avatar,
    bgImage: u.bg_image,
    isCertified: !!u.is_certified,
    companyName: u.company_name,
    realName: u.real_name
  });
});

app.put('/api/user/profile', auth, async (req, res) => {
  const { nickname, signature, avatar, bgImage, isCertified, companyName, realName } = req.body;
  try {
    await pool.query(
      `UPDATE users
          SET nickname=?, signature=?, avatar=?, bg_image=?, is_certified=?, company_name=?, real_name=?
        WHERE id=?`,
      [nickname, signature || '', avatar || '', bgImage || '', isCertified ? 1 : 0, companyName || '', realName || '', req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新失败', detail: err.message });
  }
});

app.get('/api/polls', optionalAuth, async (req, res) => {
  const { status, algorithm, q, sort, enterprise } = req.query;
  try {
    let sql = `
      SELECT p.*, u.nickname AS creator_name
      FROM polls p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (algorithm && algorithm !== 'all') {
      sql += ' AND p.algorithm = ?';
      params.push(algorithm);
    }
    if (q) {
      sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (enterprise === '1') {
      const user = await getUserById(req.user?.id);
      if (!user?.is_certified || !user.company_name) return res.json([]);
      sql += ' AND p.visibility = ? AND p.company_name = ?';
      params.push('enterprise', user.company_name);
    }

    if (sort === 'popular') sql += ' ORDER BY p.total_votes DESC';
    else if (sort === 'ending') sql += ' ORDER BY p.end_at ASC';
    else sql += ' ORDER BY p.created_at DESC';

    const [pollRows] = await pool.query(sql, params);
    const optionMap = await getPollOptionsMap(pollRows.map((p) => p.id));
    res.json(pollRows.map((p) => formatPoll(p, optionMap[p.id] || [])));
  } catch (err) {
    res.status(500).json({ error: '获取列表失败', detail: err.message });
  }
});

app.get('/api/polls/:id', optionalAuth, async (req, res) => {
  try {
    const [polls] = await pool.query(
      `SELECT p.*, u.nickname AS creator_name
         FROM polls p LEFT JOIN users u ON p.creator_id = u.id
        WHERE p.id = ?`,
      [req.params.id]
    );
    if (!polls.length) return res.status(404).json({ error: '投票不存在' });

    const [options] = await pool.query('SELECT * FROM options WHERE poll_id = ? ORDER BY id', [req.params.id]);
    const poll = formatPoll(polls[0], options);
    const user = await getUserById(req.user?.id);
    const permission = canUserVote(polls[0], user);
    res.json({ ...poll, canVote: permission.ok, denyReason: permission.reason || '' });
  } catch (err) {
    res.status(500).json({ error: '获取详情失败', detail: err.message });
  }
});

app.post('/api/polls', auth, async (req, res) => {
  const { title, description, algorithm, endAt, options, visibility = 'public', requireRealName = false } = req.body;
  if (!title?.trim() || !algorithm || !endAt || !options?.length) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const user = await getUserById(req.user.id);
  if (visibility !== 'public' && !user?.is_certified) {
    return res.status(403).json({ error: '请先完成企业认证，再创建受限投票' });
  }
  if (visibility === 'enterprise' && !user?.company_name) {
    return res.status(403).json({ error: '企业内部投票需要绑定所属企业' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO polls (title, description, algorithm, status, visibility, company_name, require_real_name, end_at, creator_id)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description?.trim() || '',
        algorithm,
        visibility,
        visibility === 'enterprise' ? user.company_name : '',
        requireRealName ? 1 : 0,
        new Date(endAt),
        req.user.id
      ]
    );

    for (const opt of options) {
      if (opt.label?.trim()) {
        await conn.query('INSERT INTO options (poll_id, label, count_val) VALUES (?, ?, 0)', [result.insertId, opt.label.trim()]);
      }
    }

    await conn.commit();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: '创建失败', detail: err.message });
  } finally {
    conn.release();
  }
});

app.delete('/api/polls/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT creator_id FROM polls WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '投票不存在' });
    if (rows[0].creator_id !== req.user.id) return res.status(403).json({ error: '无权删除他人的投票' });
    await pool.query('DELETE FROM polls WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败', detail: err.message });
  }
});

app.post('/api/polls/:id/vote', auth, async (req, res) => {
  const pollId = Number(req.params.id);
  const userId = req.user.id;
  const { algorithm, singleValue, multipleValues, weightValues, bordaOrder, scoreValues, isAnonymous = true } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [voted] = await conn.query('SELECT id FROM votes WHERE user_id = ? AND poll_id = ?', [userId, pollId]);
    if (voted.length) {
      await conn.rollback();
      return res.status(409).json({ error: '你已参与过此投票', voted: true });
    }

    const [pollRows] = await conn.query('SELECT * FROM polls WHERE id = ?', [pollId]);
    if (!pollRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: '投票不存在' });
    }

    const user = await getUserById(userId);
    const permission = canUserVote(pollRows[0], user);
    if (!permission.ok) {
      await conn.rollback();
      return res.status(403).json({ error: permission.reason });
    }

    const totalVotes = Number(pollRows[0].total_votes || 0);
    if (algorithm === 'single') {
      await conn.query('UPDATE options SET count_val = count_val + 1 WHERE id = ? AND poll_id = ?', [singleValue, pollId]);
    } else if (algorithm === 'multiple') {
      for (const optId of multipleValues || []) {
        await conn.query('UPDATE options SET count_val = count_val + 1 WHERE id = ? AND poll_id = ?', [optId, pollId]);
      }
    } else if (algorithm === 'weighted') {
      for (const [optId, weight] of Object.entries(weightValues || {})) {
        const [opt] = await conn.query('SELECT count_val FROM options WHERE id = ? AND poll_id = ?', [optId, pollId]);
        if (opt.length) {
          const next = (Number(opt[0].count_val) * totalVotes + Number(weight)) / (totalVotes + 1);
          await conn.query('UPDATE options SET count_val = ? WHERE id = ?', [Number(next.toFixed(2)), optId]);
        }
      }
    } else if (algorithm === 'borda') {
      const order = bordaOrder || [];
      for (let i = 0; i < order.length; i++) {
        const score = order.length - 1 - i;
        const [opt] = await conn.query('SELECT count_val FROM options WHERE id = ? AND poll_id = ?', [order[i], pollId]);
        if (opt.length) {
          const next = (Number(opt[0].count_val) * totalVotes + score) / (totalVotes + 1);
          await conn.query('UPDATE options SET count_val = ? WHERE id = ?', [Number(next.toFixed(2)), order[i]]);
        }
      }
    } else if (algorithm === 'scoring') {
      for (const [optId, score] of Object.entries(scoreValues || {})) {
        const [opt] = await conn.query('SELECT count_val FROM options WHERE id = ? AND poll_id = ?', [optId, pollId]);
        if (opt.length) {
          const next = (Number(opt[0].count_val) * totalVotes + Number(score)) / (totalVotes + 1);
          await conn.query('UPDATE options SET count_val = ? WHERE id = ?', [Number(next.toFixed(1)), optId]);
        }
      }
    }

    const finalAnonymous = pollRows[0].require_real_name ? 0 : (isAnonymous ? 1 : 0);
    await conn.query('UPDATE polls SET total_votes = total_votes + 1 WHERE id = ?', [pollId]);
    await conn.query(
      'INSERT INTO votes (user_id, poll_id, payload, is_anonymous) VALUES (?, ?, ?, ?)',
      [userId, pollId, JSON.stringify(req.body), finalAnonymous]
    );
    await conn.commit();
    res.json({ success: true, voted: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: '投票失败', detail: err.message });
  } finally {
    conn.release();
  }
});

app.get('/api/polls/:id/voted', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT id FROM votes WHERE user_id = ? AND poll_id = ?', [req.user.id, req.params.id]);
  res.json({ voted: rows.length > 0 });
});

app.get('/api/polls/:id/public-votes', optionalAuth, async (req, res) => {
  try {
    const [optionRows] = await pool.query('SELECT id, label FROM options WHERE poll_id = ?', [req.params.id]);
    const optionMap = new Map(optionRows.map((option) => [Number(option.id), option.label]));
    const [pollRows] = await pool.query('SELECT visibility FROM polls WHERE id = ?', [req.params.id]);
    const isEnterprisePoll = pollRows[0]?.visibility === 'enterprise';
    const [rows] = await pool.query(
      `SELECT v.id, v.user_id, v.payload, v.is_anonymous, v.created_at, u.username, u.nickname, u.real_name
         FROM votes v
         LEFT JOIN users u ON v.user_id = u.id
        WHERE v.poll_id = ?
        ORDER BY v.created_at DESC`,
      [req.params.id]
    );

    const visible = [];
    let anonymousCount = 0;

    for (const row of rows) {
      if (row.is_anonymous) {
        anonymousCount++;
        continue;
      }

      let payload = {};
      try {
        payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
      } catch (err) {
        payload = {};
      }

      visible.push({
        id: row.id,
        voterName: isEnterprisePoll
          ? (row.real_name || row.nickname || `用户${row.user_id}`)
          : `用户ID：${row.nickname || row.username || row.user_id}`,
        createdAt: new Date(row.created_at).getTime(),
        choices: describeVotePayload(payload, optionMap)
      });
    }

    res.json({ visible, anonymousCount, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: '获取实名投票记录失败', detail: err.message });
  }
});

const describeVotePayload = (payload, optionMap) => {
  const labelOf = (id) => optionMap.get(Number(id)) || `选项 ${id}`;
  if (payload.algorithm === 'single') return [labelOf(payload.singleValue)];
  if (payload.algorithm === 'multiple') return (payload.multipleValues || []).map(labelOf);
  if (payload.algorithm === 'weighted') {
    return Object.entries(payload.weightValues || {}).map(([id, weight]) => `${labelOf(id)}：${weight}%`);
  }
  if (payload.algorithm === 'borda') {
    return (payload.bordaOrder || []).map((id, index) => `${index + 1}. ${labelOf(id)}`);
  }
  if (payload.algorithm === 'scoring') {
    return Object.entries(payload.scoreValues || {}).map(([id, score]) => `${labelOf(id)}：${score} 分`);
  }
  return [];
};

app.get('/api/user/polls', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.nickname AS creator_name
       FROM polls p LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.creator_id = ?
      ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  const optionMap = await getPollOptionsMap(rows.map((p) => p.id));
  res.json(rows.map((p) => formatPoll(p, optionMap[p.id] || [])));
});

app.get('/api/user/votes', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.nickname AS creator_name, v.created_at AS voted_at
       FROM votes v
       JOIN polls p ON v.poll_id = p.id
       LEFT JOIN users u ON p.creator_id = u.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC`,
    [req.user.id]
  );
  const optionMap = await getPollOptionsMap(rows.map((p) => p.id));
  res.json(rows.map((p) => ({ ...formatPoll(p, optionMap[p.id] || []), votedAt: new Date(p.voted_at).getTime() })));
});

app.get('/api/user/activities', auth, async (req, res) => {
  const [created] = await pool.query(
    `SELECT id, title, status, created_at AS at_time, 'created' AS type FROM polls WHERE creator_id = ?`,
    [req.user.id]
  );
  const [voted] = await pool.query(
    `SELECT p.id, p.title, p.status, v.created_at AS at_time, 'voted' AS type
       FROM votes v JOIN polls p ON v.poll_id = p.id
      WHERE v.user_id = ?`,
    [req.user.id]
  );
  const rows = [...created, ...voted]
    .sort((a, b) => new Date(b.at_time) - new Date(a.at_time))
    .slice(0, 10);
  res.json(rows.map((row) => ({
    id: `${row.type}-${row.id}-${new Date(row.at_time).getTime()}`,
    pollId: row.id,
    title: row.title,
    type: row.type,
    status: normalizeStatus(row),
    timestamp: new Date(row.at_time).getTime()
  })));
});

app.post('/api/verify-enterprise', async (req, res) => {
  const { companyName, realName } = req.body;
  const company = companyName?.trim();
  const name = realName?.trim();
  if (!company || !name) {
    return res.status(400).json({ success: false, message: '请填写公司名称和真实姓名' });
  }
  try {
    const [official] = await pool.query(
      'SELECT * FROM official_enterprises WHERE LOWER(company_name) = LOWER(?) AND legal_name = ?',
      [company, name]
    );
    const [member] = await pool.query(
      'SELECT * FROM enterprise_members WHERE LOWER(company_name) = LOWER(?) AND employee_name = ?',
      [company, name]
    );
    if (official.length || member.length) {
      return res.json({ success: true, message: '企业认证成功' });
    }
    res.status(401).json({ success: false, message: '企业信息或姓名不匹配' });
  } catch (err) {
    res.status(500).json({ error: '数据库查询出错', detail: err.message });
  }
});

app.post('/api/enterprise-members/import', auth, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user?.is_certified || !user.company_name) return res.status(403).json({ error: '仅企业认证账号可导入员工' });
  const { members = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const member of members) {
      if (member.realName) {
        await conn.query(
          `INSERT IGNORE INTO enterprise_members (company_name, employee_name, employee_no, username)
           VALUES (?, ?, ?, ?)`,
          [user.company_name, member.realName, member.employeeNo || '', member.username || '']
        );
      }
    }
    await conn.commit();
    res.json({ success: true, count: members.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: '导入失败', detail: err.message });
  } finally {
    conn.release();
  }
});

app.use((err, req, res, next) => {
  console.error('服务异常:', err);
  res.status(500).json({ error: '服务器内部处理异常' });
});

ensureExtraColumns()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`后端服务已在 http://localhost:${PORT} 启动`);
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
  });
