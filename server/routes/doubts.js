const express = require('express');
const router = express.Router();
const Doubt = require('../models/Doubt');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get relevant doubts (friends + same branch/subject)
router.get('/', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: 'User not found' });
    const orConditions = [];
    if (me.friends && me.friends.length > 0) orConditions.push({ postedBy: { $in: me.friends } });
    if (me.branch) orConditions.push({ branch: me.branch });
    if (me.subjects && me.subjects.length > 0) orConditions.push({ subject: { $in: me.subjects } });

    const query = orConditions.length > 0 ? { $or: orConditions } : {};
    const doubts = await Doubt.find(query).sort('-createdAt');
    res.json(doubts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get my doubts
router.get('/mine', auth, async (req, res) => {
  try {
    const doubts = await Doubt.find({ postedBy: req.user.id }).sort('-createdAt');
    res.json(doubts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { topic, description, subject } = req.body;
    const me = await User.findById(req.user.id);
    const doubt = await Doubt.create({
      topic,
      description,
      subject,
      branch: me ? me.branch : '',
      postedBy: req.user.id,
      postedByUsername: req.user.username
    });
    req.io?.emit('doubt:new', doubt);
    res.json(doubt);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/reply', auth, async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    doubt.replies.push({ user: req.user.id, username: req.user.username, text: req.body.text });
    await doubt.save();
    res.json(doubt);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const doubt = await Doubt.findByIdAndUpdate(req.params.id, { resolved: true }, { new: true });
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });
    res.json(doubt);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


module.exports = router;
