const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'study_buddy_jwt_secret_key_2024';
const sign = (user) => jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { username, password, college, branch, subjects } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username taken' });
    const hash = password ? await bcrypt.hash(password, 10) : '';
    const user = await User.create({ username, password: hash, college, branch, subjects: subjects || [] });
    res.json({ token: sign(user), user: { _id: user._id, username: user.username, college: user.college, branch: user.branch } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.password) {
      const ok = await bcrypt.compare(password || '', user.password);
      if (!ok) return res.status(400).json({ message: 'Wrong password' });
    }
    res.json({ token: sign(user), user: { _id: user._id, username: user.username, college: user.college, branch: user.branch } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
