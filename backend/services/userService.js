const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 12;

const createUser = async (userData) => {
  try {
    const { email, password, firstName, lastName } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
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
    const user = await User.findOne({ email });
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
  getUserById,
  updateUserProfile,
  changePassword,
  deleteUser
};