const express = require('express');
const router = express.Router();
const Battle = require('../models/Battle');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const battles = await Battle.find().sort('-createdAt').limit(20);
    res.json(battles);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ message: 'Battle not found' });
    res.json(battle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { topic, level, questions, duration } = req.body;
    const battle = await Battle.create({ topic, level, questions, duration: duration || 300 });
    res.json(battle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const { groupId, groupName } = req.body;
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ message: 'Battle not found' });
    const hasGroup = battle.groups.some(g => g.toString() === groupId);
    if (!hasGroup) {
      battle.groups.push(groupId);
      battle.groupNames.push(groupName);
    }
    if (battle.groups.length >= 2) battle.status = 'active';
    await battle.save();
    res.json(battle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { groupId, groupName, answers } = req.body;
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ message: 'Battle not found' });
    let score = 0;
    const qCount = battle.questions?.length || 1;
    (battle.questions || []).forEach((q, i) => { if (answers && answers[i] === q.answer) score++; });
    const stars = score >= qCount * 0.8 ? 4 : score >= qCount * 0.6 ? 3 : score >= qCount * 0.4 ? 2 : 1;
    const existing = battle.results.findIndex(r => r.groupId?.toString() === groupId);
    if (existing >= 0) battle.results[existing] = { groupId, groupName, score, stars };
    else battle.results.push({ groupId, groupName, score, stars });
    if (battle.results.length >= battle.groups.length) battle.status = 'completed';
    await battle.save();
    res.json(battle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/discuss', auth, async (req, res) => {
  try {
    const { text, questionIndex, type } = req.body;
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ message: 'Battle not found' });
    battle.discussion.push({ user: req.user.username, text, questionIndex: questionIndex ?? -1, type: type || 'general' });
    await battle.save();
    res.json(battle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/discuss/:idx/upvote', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ message: 'Battle not found' });
    const item = battle.discussion[req.params.idx];
    if (!item) return res.status(404).json({ message: 'Discussion item not found' });
    item.upvotes = (item.upvotes || 0) + 1;
    await battle.save();
    res.json(battle);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


module.exports = router;
