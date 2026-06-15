import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String, default: '📦' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
});

export default mongoose.model('Category', categorySchema);
