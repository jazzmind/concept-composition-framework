import { MongoClient, Db, Collection, ObjectId } from "mongodb";

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

  constructor() {
    this.connect();
  }

  private async connect() {
    const connectionString = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(connectionString);
    await client.connect();
    this.db = client.db(process.env.MONGODB_DB || "quizzie");
    
    this.quizzes = this.db.collection<QuizRecord>("quizzes");
    this.questions = this.db.collection<QuestionRecord>("questions");
    this.options = this.db.collection<OptionRecord>("options");
    
    // Create indexes
    await this.quizzes.createIndex({ quiz: 1 }, { unique: true });
    await this.quizzes.createIndex({ owner: 1 });
    await this.questions.createIndex({ question: 1 }, { unique: true });
    await this.questions.createIndex({ quiz: 1 });
    await this.options.createIndex({ option: 1 }, { unique: true });
    await this.options.createIndex({ question: 1 });
  }

  async createQuiz({ owner, title }: { owner: string; title: string }): Promise<{ quiz: string } | { error: string }> {
    try {
      const quiz = new ObjectId().toString();
      const record: QuizRecord = {
        _id: new ObjectId(),
        quiz,
        owner,
        title,
        createdAt: new Date()
      };

      await this.quizzes.insertOne(record);
      return { quiz };
    } catch (error) {
      return { error: `Failed to create quiz: ${error}` };
    }
  }

  async deleteQuiz({ quiz }: { quiz: string }): Promise<{ quiz: string } | { error: string }> {
    try {
      // Get all questions for this quiz
      const questions = await this.questions.find({ quiz }).toArray();
      
      // Delete all options for all questions
      for (const question of questions) {
        await this.options.deleteMany({ question: question.question });
      }
      
      // Delete all questions
      await this.questions.deleteMany({ quiz });
      
      // Delete the quiz
      await this.quizzes.deleteOne({ quiz });
      
      return { quiz };
    } catch (error) {
      return { error: `Failed to delete quiz: ${error}` };
    }
  }

  async updateQuizTitle({ quiz, title }: { quiz: string; title: string }): Promise<{ quiz: string } | { error: string }> {
    try {
      const result = await this.quizzes.updateOne({ quiz }, { $set: { title } });
      if (result.matchedCount === 0) {
        return { error: "Quiz not found" };
      }
      return { quiz };
    } catch (error) {
      return { error: `Failed to update quiz title: ${error}` };
    }
  }

  async addQuestion({ quiz, text }: { quiz: string; text: string }): Promise<{ question: string } | { error: string }> {
    try {
      // Verify quiz exists
      const quizExists = await this.quizzes.findOne({ quiz });
      if (!quizExists) {
        return { error: "Quiz not found" };
      }

      const question = new ObjectId().toString();
      const record: QuestionRecord = {
        _id: new ObjectId(),
        question,
        quiz,
        text,
        createdAt: new Date()
      };

      await this.questions.insertOne(record);
      return { question };
    } catch (error) {
      return { error: `Failed to add question: ${error}` };
    }
  }

  async deleteQuestion({ question }: { question: string }): Promise<{ question: string } | { error: string }> {
    try {
      // Delete all options for this question
      await this.options.deleteMany({ question });
      
      // Delete the question
      await this.questions.deleteOne({ question });
      
      return { question };
    } catch (error) {
      return { error: `Failed to delete question: ${error}` };
    }
  }

  async updateQuestion({ question, text }: { question: string; text: string }): Promise<{ question: string } | { error: string }> {
    try {
      const result = await this.questions.updateOne({ question }, { $set: { text } });
      if (result.matchedCount === 0) {
        return { error: "Question not found" };
      }
      return { question };
    } catch (error) {
      return { error: `Failed to update question: ${error}` };
    }
  }

  async addOption({ question, label }: { question: string; label: string }): Promise<{ option: string } | { error: string }> {
    try {
      // Verify question exists
      const questionExists = await this.questions.findOne({ question });
      if (!questionExists) {
        return { error: "Question not found" };
      }

      const option = new ObjectId().toString();
      const record: OptionRecord = {
        _id: new ObjectId(),
        option,
        question,
        label,
        createdAt: new Date()
      };

      await this.options.insertOne(record);
      return { option };
    } catch (error) {
      return { error: `Failed to add option: ${error}` };
    }
  }

  async deleteOption({ option }: { option: string }): Promise<{ option: string } | { error: string }> {
    try {
      await this.options.deleteOne({ option });
      return { option };
    } catch (error) {
      return { error: `Failed to delete option: ${error}` };
    }
  }

  async updateOption({ option, label }: { option: string; label: string }): Promise<{ option: string } | { error: string }> {
    try {
      const result = await this.options.updateOne({ option }, { $set: { label } });
      if (result.matchedCount === 0) {
        return { error: "Option not found" };
      }
      return { option };
    } catch (error) {
      return { error: `Failed to update option: ${error}` };
    }
  }

  async _getQuizzesByOwner({ owner }: { owner: string }): Promise<Array<{ quiz: string; title: string }>> {
    try {
      const quizzes = await this.quizzes.find({ owner }).sort({ createdAt: -1 }).toArray();
      return quizzes.map(q => ({ quiz: q.quiz, title: q.title }));
    } catch (error) {
      return [];
    }
  }

  async _getQuiz({ quiz }: { quiz: string }): Promise<Array<{ quiz: string; owner: string; title: string }>> {
    try {
      const record = await this.quizzes.findOne({ quiz });
      return record ? [{ quiz: record.quiz, owner: record.owner, title: record.title }] : [];
    } catch (error) {
      return [];
    }
  }

  async _getQuestions({ quiz }: { quiz: string }): Promise<Array<{ question: string; text: string }>> {
    try {
      const questions = await this.questions.find({ quiz }).sort({ createdAt: 1 }).toArray();
      return questions.map(q => ({ question: q.question, text: q.text }));
    } catch (error) {
      return [];
    }
  }

  async _getOptions({ question }: { question: string }): Promise<Array<{ option: string; label: string }>> {
    try {
      const options = await this.options.find({ question }).sort({ createdAt: 1 }).toArray();
      return options.map(o => ({ option: o.option, label: o.label }));
    } catch (error) {
      return [];
    }
  }

  async _getQuestion({ question }: { question: string }): Promise<Array<{ question: string; text: string; quiz: string }>> {
    try {
      const record = await this.questions.findOne({ question });
      return record ? [{ question: record.question, text: record.text, quiz: record.quiz }] : [];
    } catch (error) {
      return [];
    }
  }
}
