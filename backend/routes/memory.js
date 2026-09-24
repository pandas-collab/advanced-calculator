const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Memory = require('../models/Memory');

// GET /api/memories - Get all memories for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const memories = await Memory.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/memories/:id - Get specific memory by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, userId: req.user.id });
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }
    res.json(memory);
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/memories - Create new memory
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, tags, type } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const memory = new Memory({
      title,
      content,
      tags: tags || [],
      type: type || 'text',
      userId: req.user.id
    });

    await memory.save();
    res.status(201).json(memory);
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/memories/:id - Update memory
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, tags, type } = req.body;

    const memory = await Memory.findOne({ _id: req.params.id, userId: req.user.id });
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    memory.title = title || memory.title;
    memory.content = content || memory.content;
    memory.tags = tags !== undefined ? tags : memory.tags;
    memory.type = type || memory.type;
    memory.updatedAt = Date.now();

    await memory.save();
    res.json(memory);
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/memories/:id - Delete memory
router.delete('/:id', auth, async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, userId: req.user.id });
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    await Memory.deleteOne({ _id: req.params.id });
    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/memories/search/:query - Search memories
router.get('/search/:query', auth, async (req, res) => {
  try {
    const query = req.params.query;
    const memories = await Memory.find({
      userId: req.user.id,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ createdAt: -1 });

    res.json(memories);
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/memories/tags/all - Get all unique tags for user
router.get('/tags/all', auth, async (req, res) => {
  try {
    const memories = await Memory.find({ userId: req.user.id });
    const allTags = memories.reduce((tags, memory) => {
      return [...tags, ...memory.tags];
    }, []);
    const uniqueTags = [...new Set(allTags)];
    res.json(uniqueTags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;