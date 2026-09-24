const History = require("../models/History");
const Calculation = require("../models/Calculation");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId } = req.query;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const history = await prisma.chatHistory.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    const total = await prisma.chatHistory.count({
      where: {
        userId: userId
      }
    });

    res.json({
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

const searchHistory = async (req, res) => {
  try {
    const { query, userId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const history = await prisma.chatHistory.findMany({
      where: {
        userId: userId,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            messages: {
              some: {
                content: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: parseInt(offset),
      take: parseInt(limit),
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    const total = await prisma.chatHistory.count({
      where: {
        userId: userId,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            messages: {
              some: {
                content: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      }
    });

    res.json({
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      query
    });
  } catch (error) {
    console.error('Error searching history:', error);
    res.status(500).json({ error: 'Failed to search history' });
  }
};

const deleteHistory = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const history = await prisma.chatHistory.findFirst({
      where: {
        id: historyId,
        userId: userId
      }
    });

    if (!history) {
      return res.status(404).json({ error: 'History not found or access denied' });
    }

    await prisma.message.deleteMany({
      where: {
        chatHistoryId: historyId
      }
    });

    await prisma.chatHistory.delete({
      where: {
        id: historyId
      }
    });

    res.json({ message: 'History deleted successfully' });
  } catch (error) {
    console.error('Error deleting history:', error);
    res.status(500).json({ error: 'Failed to delete history' });
  }
};

const clearHistory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userHistory = await prisma.chatHistory.findMany({
      where: {
        userId: userId
      },
      select: {
        id: true
      }
    });

    const historyIds = userHistory.map(h => h.id);

    await prisma.message.deleteMany({
      where: {
        chatHistoryId: {
          in: historyIds
        }
      }
    });

    await prisma.chatHistory.deleteMany({
      where: {
        userId: userId
      }
    });

    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};

const getMemory = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const memory = await prisma.userMemory.findUnique({
      where: {
        userId: userId
      }
    });

    if (!memory) {
      return res.json({ memory: null });
    }

    res.json({ memory: memory.content });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
};

const saveMemory = async (req, res) => {
  try {
    const { userId, memory } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!memory) {
      return res.status(400).json({ error: 'Memory content is required' });
    }

    const savedMemory = await prisma.userMemory.upsert({
      where: {
        userId: userId
      },
      update: {
        content: memory,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        content: memory
      }
    });

    res.json({ 
      message: 'Memory saved successfully',
      memory: savedMemory.content
    });
  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({ error: 'Failed to save memory' });
  }
};

const clearMemory = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await prisma.userMemory.deleteMany({
      where: {
        userId: userId
      }
    });

    res.json({ message: 'Memory cleared successfully' });
  } catch (error) {
    console.error('Error clearing memory:', error);
    res.status(500).json({ error: 'Failed to clear memory' });
  }
};

module.exports = {
  getHistory,
  searchHistory,
  deleteHistory,
  clearHistory,
  getMemory,
  saveMemory,
  clearMemory
};