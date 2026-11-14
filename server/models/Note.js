import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 90,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  category: {
    type: String,
    required: true,
    enum: ['Personal', 'Work', 'Ideas', 'To-do'],
  },
  color: {
    type: String,
    required: true,
    enum: ['peach', 'lavender', 'mint', 'butter'],
    default: 'peach',
  },
  favorite: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Note', noteSchema);
