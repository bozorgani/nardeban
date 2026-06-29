import mongoose from 'mongoose';

export function parseCursor(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const [dateStr, idStr] = raw.split('|');
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(idStr)) {
    return null;
  }

  return {
    date,
    id: new mongoose.Types.ObjectId(idStr),
  };
}
