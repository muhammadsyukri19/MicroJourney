import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILkpdSubmission extends Document {
  createdAt: Date;
  studentName: string;
  studentClass: string;
  sessionId: string;
  lkpdStep1: string;
  lkpdStep2: string;
  lkpd1: string;
  lkpd2: string;
  lkpd3q1: string;
  lkpd3q2: string;
  lkpd4: string;
  commitment: string;
  totalParticles: number;
  mostDangerousOrgan: string;
  selectedFoods: string[];
  studentAccountEmail: string;
  assessmentEligible: boolean;
  quizCorrect: number;
  quizWrong: number;
  driveLink?: string;
  sosmedLink?: string;
  actionNote?: string;
  rating?: number;
  feedback?: string;
  preTestScore?: number;
  postTestScore?: number;
}

const LkpdSubmissionSchema = new Schema<ILkpdSubmission>({
  createdAt:          { type: Date, default: Date.now },
  studentName:        { type: String, required: true },
  studentClass:       { type: String, required: true },
  sessionId:          { type: String, required: true },
  lkpdStep1:          { type: String, default: '' },
  lkpdStep2:          { type: String, default: '' },
  lkpd1:              { type: String, default: '' },
  lkpd2:              { type: String, default: '' },
  lkpd3q1:            { type: String, default: '' },
  lkpd3q2:            { type: String, default: '' },
  lkpd4:              { type: String, default: '' },
  commitment:         { type: String, default: '' },
  totalParticles:     { type: Number, default: 0 },
  mostDangerousOrgan: { type: String, default: '' },
  selectedFoods:      { type: [String], default: [] },
  studentAccountEmail:{ type: String, default: '' },
  assessmentEligible: { type: Boolean, default: false },
  quizCorrect:        { type: Number, default: 0 },
  quizWrong:          { type: Number, default: 0 },
  driveLink:          { type: String, default: '' },
  sosmedLink:         { type: String, default: '' },
  actionNote:         { type: String, default: '' },
  rating:             { type: Number, default: 5 },
  feedback:           { type: String, default: '' },
  preTestScore:       { type: Number, default: null },
  postTestScore:      { type: Number, default: null },
});

const LkpdSubmission: Model<ILkpdSubmission> =
  mongoose.models.LkpdSubmission ||
  mongoose.model<ILkpdSubmission>('LkpdSubmission', LkpdSubmissionSchema);

export default LkpdSubmission;
