const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    // Return tests created by user OR tests user has participated in
    const tests = await Test.find({
      $or: [{ createdBy: req.user.id }, { participants: req.user.id }]
    });
    res.json(tests);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, questions, duration } = req.body;
    const test = await Test.create({
      title,
      questions,
      duration: duration || 600,
      createdBy: req.user.id,
      creatorName: req.user.username,
      participants: []
    });
    res.json(test);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.createdBy && test.createdBy.toString() === req.user.id)
      return res.status(403).json({ message: 'You cannot take your own test' });
    const isParticipant = test.participants.some(p => p.toString() === req.user.id);
    if (!isParticipant) test.participants.push(req.user.id);
    test.status = 'active';
    await test.save();
    res.json(test);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    let score = 0;
    (test.questions || []).forEach((q, i) => { if (answers && answers[i] === q.answer) score++; });
    const existing = test.results.findIndex(r => r.user?.toString() === req.user.id);
    if (existing >= 0) test.results[existing] = { user: req.user.id, username: req.user.username, score, answers };
    else test.results.push({ user: req.user.id, username: req.user.username, score, answers });
    if (test.participants.length > 0 && test.results.length >= test.participants.length) {
      test.status = 'completed';
    }
    await test.save();
    await User.findByIdAndUpdate(req.user.id, { $inc: { testsTaken: 1 } });
    res.json(test);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


module.exports = router;
