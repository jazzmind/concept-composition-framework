import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

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

  constructor() {}

  private async connect() {
    if (this.activations) return;
    const uri = process.env.MONGODB_URI as string;
    const dbName = process.env.MONGODB_DB as string;
    const client = new MongoClient(uri);
    await client.connect();
    this.db = client.db(dbName);
    this.activations = this.db.collection<ActivationRecord>('activations');
    this.votes = this.db.collection<VoteRecord>('votes');
    await this.activations.createIndex({ activation: 1 }, { unique: true });
    await this.activations.createIndex({ question: 1 });
    await this.votes.createIndex({ activation: 1, user: 1 }, { unique: true });
    await this.votes.createIndex({ option: 1 });
  }

  async activate({ question }: { question: string }): Promise<{ activation: string } | { error: string }> {
    await this.connect();
    // deactivate previous
    await this.activations.updateMany({ question }, { $set: { isActive: false } });
    const activation = new ObjectId().toHexString();
    await this.activations.insertOne({ _id: new ObjectId(activation), activation, question, isActive: true, showResults: false, createdAt: new Date() });
    return { activation };
  }

  async deactivate({ activation }: { activation: string }): Promise<{ activation: string } | { error: string }> {
    await this.connect();
    const res = await this.activations.updateOne({ activation }, { $set: { isActive: false } });
    if (!res.matchedCount) return { error: 'activation_not_found' };
    return { activation };
  }

  async showResults({ activation }: { activation: string }): Promise<{ activation: string } | { error: string }> {
    await this.connect();
    const res = await this.activations.updateOne({ activation }, { $set: { showResults: true } });
    if (!res.matchedCount) return { error: 'activation_not_found' };
    return { activation };
  }

  async hideResults({ activation }: { activation: string }): Promise<{ activation: string } | { error: string }> {
    await this.connect();
    const res = await this.activations.updateOne({ activation }, { $set: { showResults: false } });
    if (!res.matchedCount) return { error: 'activation_not_found' };
    return { activation };
  }

  async vote({ activation, user, option }: { activation: string; user: string; option: string }): Promise<{ activation: string } | { error: string }> {
    await this.connect();
    const now = new Date();
    const existing = await this.votes.findOne({ activation, user });
    if (existing) {
      await this.votes.updateOne({ _id: existing._id }, { $set: { option, updatedAt: now } });
    } else {
      await this.votes.insertOne({ _id: new ObjectId(), activation, user, option, createdAt: now, updatedAt: now });
    }
    return { activation };
  }

  async _getActivation({ activation }: { activation: string }): Promise<Array<{ activation: string; question: string; isActive: boolean; showResults: boolean }>> {
    await this.connect();
    const rec = await this.activations.findOne({ activation }, { projection: { _id: 0, activation: 1, question: 1, isActive: 1, showResults: 1 } });
    if (!rec) return [];
    return [rec];
  }

  async _getActiveByQuestion({ question }: { question: string }): Promise<Array<{ activation: string; isActive: boolean; showResults: boolean }>> {
    await this.connect();
    const rec = await this.activations.findOne({ question, isActive: true }, { projection: { _id: 0, activation: 1, isActive: 1, showResults: 1 } });
    if (!rec) return [];
    return [rec];
  }

  async _getVotesByActivation({ activation }: { activation: string }): Promise<Array<{ activation: string; user: string; option: string }>> {
    await this.connect();
    const arr = await this.votes.find({ activation }, { projection: { _id: 0, activation: 1, user: 1, option: 1 } }).toArray();
    return arr;
  }

  async _getVoteCounts({ activation }: { activation: string }): Promise<Array<{ option: string; count: number; total: number }>> {
    await this.connect();
    const pipeline = [
      { $match: { activation } },
      { $group: { _id: '$option', count: { $sum: 1 } } },
      { $group: { _id: null, items: { $push: { option: '$_id', count: '$count' } }, total: { $sum: '$count' } } },
      { $unwind: '$items' },
      { $project: { _id: 0, option: '$items.option', count: '$items.count', total: '$total' } }
    ];
    const arr = await this.votes.aggregate(pipeline).toArray();
    return arr as Array<{ option: string; count: number; total: number }>;
  }

  async _getUserVote({ activation, user }: { activation: string; user: string }): Promise<Array<{ option: string }>> {
    await this.connect();
    const rec = await this.votes.findOne({ activation, user }, { projection: { _id: 0, option: 1 } });
    if (!rec) return [];
    return [rec];
  }
}


