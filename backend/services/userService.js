const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

/**
 * Validate password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
const validatePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error validating password');
  }
};

const createUser = async (userData) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedUser = await newUser.save();
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = savedUser.toObject();
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
};

const authenticateUser = async (email, password) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @param {boolean} includePassword - Whether to include password in result
 * @returns {Promise<Object|null>} - User object or null
 */
const findUserByEmail = async (email, includePassword = false) => {
  try {
    const query = User.findOne({ email: email.toLowerCase() });
    
    if (!includePassword) {
      query.select('-password');
    }

    return await query.exec();
  } catch (error) {
    throw new Error(`Error finding user by email: ${error.message}`);
  }
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @param {boolean} includePassword - Whether to include password in result
 * @returns {Promise<Object|null>} - User object or null
 */
const findUserById = async (userId, includePassword = false) => {
  try {
    const query = User.findById(userId);
    
    if (!includePassword) {
      query.select('-password');
    }

    return await query.exec();
  } catch (error) {
    throw new Error(`Error finding user by ID: ${error.message}`);
  }
};

const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    throw error;
  }
};

const updateUserProfile = async (userId, updateData) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'email', 'phone', 'avatar'];
    const updates = {};
    
    // Filter only allowed updates
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    // Check if email is being updated and if it's already taken
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      const existingUser = await User.findOne({ 
        email: updates.email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        throw new Error('Email is already in use');
      }
    }

    updates.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated user object
 */
const updateUser = async (userId, updateData) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'email', 'role', 'isActive', 'profile'];
    const updates = {};

    // Filter allowed updates
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    // Handle email normalization
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      
      // Check if new email already exists
      const existingUser = await User.findOne({ 
        email: updates.email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Handle password update
    if (updateData.password) {
      updates.password = await hashPassword(updateData.password);
    }

    updates.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
};

const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    return { message: 'Password updated successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Deleted user object
 */
const deleteUser = async (userId) => {
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully', userId };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createUser,
  authenticateUser,
  findUserByEmail,
  findUserById,
  getUserById,
  updateUserProfile,
  updateUser,
  changePassword,
  deleteUser,
  validatePassword,
  hashPassword
};
