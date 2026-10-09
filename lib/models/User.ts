import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'student' | 'teacher' | 'superadmin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  className?: string;
  school?: string;
  phoneNumber?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'teacher', 'superadmin'], required: true },
    className: { type: String, default: '' },
    school: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

/** Default initial accounts so demo & administration are immediately functional */
export const DEFAULT_USERS = [
  {
    name: 'Guru IPA 1',
    email: 'guru1@gmail.com',
    password: 'guruguru',
    role: 'teacher' as const,
  },
  {
    name: 'Super Admin',
    email: 'superadmin@gmail.com',
    password: 'superadmin',
    role: 'superadmin' as const,
  },
];

/** Ensures that the default users exist in MongoDB */
export async function ensureDefaultUsers() {
  for (const def of DEFAULT_USERS) {
    const exists = await User.findOne({ email: def.email.toLowerCase() });
    if (!exists) {
      await User.create(def);
    }
  }
}
