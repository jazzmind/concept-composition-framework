import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

export interface QuizRecord {
  _id: ObjectId;
  quiz: string;
  owner: string;
  title: string;
  createdAt: Date;
}

export interface QuestionRecord {
  _id: ObjectId;
  question: string;
  quiz: string;
  text: string;
  createdAt: Date;
}

export interface OptionRecord {
  _id: ObjectId;
  option: string;
  question: string;
  label: string;
  createdAt: Date;
}

export class QuizConcept {
  private db!: Db;
  private quizzes!: Collection<QuizRecord>;
  private questions!: Collection<QuestionRecord>;
  private options!: Collection<OptionRecord>;

  constructor() {}

  private async connect() {
    if (this.quizzes) return;
    const uri = process.env.MONGODB_URI as string;
    const dbName = process.env.MONGODB_DB as string;
    const client = new MongoClient(uri);
    await client.connect();
    this.db = client.db(dbName);
    this.quizzes = this.db.collection<QuizRecord>('quizzes');
    this.questions = this.db.collection<QuestionRecord>('questions');
    this.options = this.db.collection<OptionRecord>('options');
    await this.quizzes.createIndex({ quiz: 1 }, { unique: true });
    await this.quizzes.createIndex({ owner: 1 });
    await this.questions.createIndex({ question: 1 }, { unique: true });
    await this.questions.createIndex({ quiz: 1 });
    await this.options.createIndex({ option: 1 }, { unique: true });
    await this.options.createIndex({ question: 1 });
  }

  async createQuiz({ owner, title }: { owner: string; title: string }): Promise<{ quiz: string } | { error: string }> {
    await this.connect();
    const quiz = new ObjectId().toHexString();
    await this.quizzes.insertOne({ _id: new ObjectId(quiz), quiz, owner, title, createdAt: new Date() });
    return { quiz };
  }

  async deleteQuiz({ quiz }: { quiz: string }): Promise<{ quiz: string } | { error: string }> {
    await this.connect();
    const res = await this.quizzes.deleteOne({ quiz });
    const questionIds = await this.questions
      .find({ quiz }, { projection: { _id: 0, question: 1 } })
      .map(doc => doc.question)
      .toArray();
    await this.questions.deleteMany({ quiz });
    if (questionIds.length > 0) {
      await this.options.deleteMany({ question: { $in: questionIds } });
    }
    if (!res.deletedCount) return { error: 'quiz_not_found' };
    return { quiz };
  }

  async updateQuizTitle({ quiz, title }: { quiz: string; title: string }): Promise<{ quiz: string } | { error: string }> {
    await this.connect();
    const res = await this.quizzes.updateOne({ quiz }, { $set: { title } });
    if (!res.matchedCount) return { error: 'quiz_not_found' };
    return { quiz };
  }

  async addQuestion({ quiz, text }: { quiz: string; text: string }): Promise<{ question: string } | { error: string }> {
    await this.connect();
    const question = new ObjectId().toHexString();
    await this.questions.insertOne({ _id: new ObjectId(question), question, quiz, text, createdAt: new Date() });
    return { question };
  }

  async deleteQuestion({ question }: { question: string }): Promise<{ question: string } | { error: string }> {
    await this.connect();
    const res = await this.questions.deleteOne({ question });
    await this.options.deleteMany({ question });
    if (!res.deletedCount) return { error: 'question_not_found' };
    return { question };
  }

  async updateQuestion({ question, text }: { question: string; text: string }): Promise<{ question: string } | { error: string }> {
    await this.connect();
    const res = await this.questions.updateOne({ question }, { $set: { text } });
    if (!res.matchedCount) return { error: 'question_not_found' };
    return { question };
  }

  async addOption({ question, label }: { question: string; label: string }): Promise<{ option: string } | { error: string }> {
    await this.connect();
    const option = new ObjectId().toHexString();
    await this.options.insertOne({ _id: new ObjectId(option), option, question, label, createdAt: new Date() });
    return { option };
  }

  async deleteOption({ option }: { option: string }): Promise<{ option: string } | { error: string }> {
    await this.connect();
    const res = await this.options.deleteOne({ option });
    if (!res.deletedCount) return { error: 'option_not_found' };
    return { option };
  }

  async updateOption({ option, label }: { option: string; label: string }): Promise<{ option: string } | { error: string }> {
    await this.connect();
    const res = await this.options.updateOne({ option }, { $set: { label } });
    if (!res.matchedCount) return { error: 'option_not_found' };
    return { option };
  }

  async _getQuizzesByOwner({ owner }: { owner: string }): Promise<Array<{ quiz: string; title: string }>> {
    await this.connect();
    const arr = await this.quizzes.find({ owner }, { projection: { _id: 0, quiz: 1, title: 1 } }).toArray();
    return arr.map(({ quiz, title }) => ({ quiz, title }));
  }

  async _getQuiz({ quiz }: { quiz: string }): Promise<Array<{ quiz: string; owner: string; title: string }>> {
    await this.connect();
    const rec = await this.quizzes.findOne({ quiz }, { projection: { _id: 0, quiz: 1, owner: 1, title: 1 } });
    if (!rec) return [];
    return [rec];
  }

  async _getQuestions({ quiz }: { quiz: string }): Promise<Array<{ question: string; text: string }>> {
    await this.connect();
    const arr = await this.questions.find({ quiz }, { projection: { _id: 0, question: 1, text: 1 } }).toArray();
    return arr.map(({ question, text }) => ({ question, text }));
  }

  async _getOptions({ question }: { question: string }): Promise<Array<{ option: string; label: string }>> {
    await this.connect();
    const arr = await this.options.find({ question }, { projection: { _id: 0, option: 1, label: 1 } }).toArray();
    return arr.map(({ option, label }) => ({ option, label }));
  }

  async _getQuestion({ question }: { question: string }): Promise<Array<{ question: string; text: string; quiz: string }>> {
    await this.connect();
    const rec = await this.questions.findOne({ question }, { projection: { _id: 0, question: 1, text: 1, quiz: 1 } });
    if (!rec) return [];
    return [rec];
  }
}


