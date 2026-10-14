const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get my notes
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.user.id, groupId: null });
    res.json(notes);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get group notes
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const notes = await Note.find({ groupId: req.params.groupId });
    res.json(notes);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get single note
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create note
router.post('/', auth, async (req, res) => {
  try {
    const { title, subject, content, groupId } = req.body;
    const safeContent = content || '';
    const summary = safeContent.substring(0, 120) + (safeContent.length > 120 ? '...' : '');
    const note = await Note.create({ title, subject, content: safeContent, summary, owner: req.user.id, ownerName: req.user.username, groupId: groupId || null });
    await User.findByIdAndUpdate(req.user.id, { $inc: { notesUploaded: 1 } });
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Add tag to note
router.post('/:id/tag', auth, async (req, res) => {
  try {
    const { text, type, startIndex, endIndex } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    note.tags.push({ text, type, startIndex, endIndex, createdBy: req.user.id, thread: [] });
    await note.save();
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Reply to tag thread
router.post('/:id/tag/:tagId/reply', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    const tag = note.tags.id(req.params.tagId);
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    tag.thread.push({ user: req.user.id, username: req.user.username, message: req.body.message });
    await note.save();
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Resolve tag
router.put('/:id/tag/:tagId/resolve', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    const tag = note.tags.id(req.params.tagId);
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    tag.resolved = true;
    await note.save();
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


// Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note not found or unauthorized' });
    await User.findByIdAndUpdate(req.user.id, { $inc: { notesUploaded: -1 } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
