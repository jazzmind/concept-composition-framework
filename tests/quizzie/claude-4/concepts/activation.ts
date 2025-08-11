import { MongoClient, Db, Collection, ObjectId } from "mongodb";

export interface ActivationRecord {
  _id: ObjectId;
  activation: string;
  question: string;
  isActive: boolean;
  showResults: boolean;
  createdAt: Date;
}

export interface VoteRecord {
  _id: ObjectId;
  activation: string;
  user: string;
  option: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ActivationConcept {
  private db!: Db;
  private activations!: Collection<ActivationRecord>;
  private votes!: Collection<VoteRecord>;

  constructor() {
    this.connect();
  }

  private async connect() {
    const connectionString = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(connectionString);
    await client.connect();
    this.db = client.db(process.env.MONGODB_DB || "quizzie");
    
    this.activations = this.db.collection<ActivationRecord>("activations");
    this.votes = this.db.collection<VoteRecord>("votes");
    
    // Create indexes
    await this.activations.createIndex({ activation: 1 }, { unique: true });
    await this.activations.createIndex({ question: 1 });
    await this.votes.createIndex({ activation: 1, user: 1 }, { unique: true });
    await this.votes.createIndex({ activation: 1 });
  }

  async activate({ question }: { question: string }): Promise<{ activation: string } | { error: string }> {
    try {
      const activation = new ObjectId().toString();
      const record: ActivationRecord = {
        _id: new ObjectId(),
        activation,
        question,
        isActive: true,
        showResults: false,
        createdAt: new Date()
      };

      await this.activations.insertOne(record);
      return { activation };
    } catch (error) {
      return { error: `Failed to activate question: ${error}` };
    }
  }

  async deactivate({ activation }: { activation: string }): Promise<{ activation: string } | { error: string }> {
    try {
      const result = await this.activations.updateOne(
        { activation },
        { $set: { isActive: false } }
      );
      
      if (result.matchedCount === 0) {
        return { error: "Activation not found" };
      }
      
      return { activation };
    } catch (error) {
      return { error: `Failed to deactivate: ${error}` };
    }
  }

  async showResults({ activation }: { activation: string }): Promise<{ activation: string } | { error: string }> {
    try {
      const result = await this.activations.updateOne(
        { activation },
        { $set: { showResults: true } }
      );
      
      if (result.matchedCount === 0) {
        return { error: "Activation not found" };
      }
      
      return { activation };
    } catch (error) {
      return { error: `Failed to show results: ${error}` };
    }
  }

  async hideResults({ activation }: { activation: string }): Promise<{ activation: string } | { error: string }> {
    try {
      const result = await this.activations.updateOne(
        { activation },
        { $set: { showResults: false } }
      );
      
      if (result.matchedCount === 0) {
        return { error: "Activation not found" };
      }
      
      return { activation };
    } catch (error) {
      return { error: `Failed to hide results: ${error}` };
    }
  }

  async vote({ activation, user, option }: { activation: string; user: string; option: string }): Promise<{ activation: string } | { error: string }> {
    try {
      // Check if activation exists and is active
      const activationRecord = await this.activations.findOne({ activation });
      if (!activationRecord) {
        return { error: "Activation not found" };
      }
      if (!activationRecord.isActive) {
        return { error: "Voting is not active for this question" };
      }

      const now = new Date();
      await this.votes.replaceOne(
        { activation, user },
        {
          _id: new ObjectId(),
          activation,
          user,
          option,
          createdAt: now,
          updatedAt: now
        },
        { upsert: true }
      );
      
      return { activation };
    } catch (error) {
      return { error: `Failed to record vote: ${error}` };
    }
  }

  async _getActivation({ activation }: { activation: string }): Promise<Array<{ activation: string; question: string; isActive: boolean; showResults: boolean }>> {
    try {
      const record = await this.activations.findOne({ activation });
      return record ? [{
        activation: record.activation,
        question: record.question,
        isActive: record.isActive,
        showResults: record.showResults
      }] : [];
    } catch (error) {
      return [];
    }
  }

  async _getActiveByQuestion({ question }: { question: string }): Promise<Array<{ activation: string; isActive: boolean; showResults: boolean }>> {
    try {
      const records = await this.activations.find({ question, isActive: true }).toArray();
      return records.map(r => ({
        activation: r.activation,
        isActive: r.isActive,
        showResults: r.showResults
      }));
    } catch (error) {
      return [];
    }
  }

  async _getVotesByActivation({ activation }: { activation: string }): Promise<Array<{ activation: string; user: string; option: string }>> {
    try {
      const votes = await this.votes.find({ activation }).toArray();
      return votes.map(v => ({
        activation: v.activation,
        user: v.user,
        option: v.option
      }));
    } catch (error) {
      return [];
    }
  }

  async _getVoteCounts({ activation }: { activation: string }): Promise<Array<{ option: string; count: number; total: number }>> {
    try {
      const votes = await this.votes.find({ activation }).toArray();
      const total = votes.length;
      
      const counts = new Map<string, number>();
      for (const vote of votes) {
        counts.set(vote.option, (counts.get(vote.option) || 0) + 1);
      }
      
      const result: Array<{ option: string; count: number; total: number }> = [];
      for (const [option, count] of counts.entries()) {
        result.push({ option, count, total });
      }
      
      return result;
    } catch (error) {
      return [];
    }
  }

  async _getUserVote({ activation, user }: { activation: string; user: string }): Promise<Array<{ option: string }>> {
    try {
      const vote = await this.votes.findOne({ activation, user });
      return vote ? [{ option: vote.option }] : [];
    } catch (error) {
      return [];
    }
  }
}
