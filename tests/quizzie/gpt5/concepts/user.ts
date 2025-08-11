import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

export interface UserRecord {
  _id: ObjectId;
  user: string;
  name: string;
}

export class UserConcept {
  private db!: Db;
  private collection!: Collection<UserRecord>;

  constructor() {}

  private async connect() {
    if (this.collection) return;
    const uri = process.env.MONGODB_URI as string;
    const dbName = process.env.MONGODB_DB as string;
    const client = new MongoClient(uri);
    await client.connect();
    this.db = client.db(dbName);
    this.collection = this.db.collection<UserRecord>('users');
    await this.collection.createIndex({ user: 1 }, { unique: true });
    await this.collection.createIndex({ name: 1 });
  }

  async register({ name }: { name: string }): Promise<{ user: string } | { error: string }> {
    await this.connect();
    const user = new ObjectId().toHexString();
    await this.collection.insertOne({ _id: new ObjectId(user), user, name });
    return { user };
  }

  async updateName({ user, newName }: { user: string; newName: string }): Promise<{ user: string } | { error: string }> {
    await this.connect();
    const res = await this.collection.updateOne({ user }, { $set: { name: newName } });
    if (!res.matchedCount) return { error: 'user_not_found' };
    return { user };
  }

  async _getById({ user }: { user: string }): Promise<Array<{ user: string; name: string }>> {
    await this.connect();
    const rec = await this.collection.findOne({ user });
    if (!rec) return [];
    return [{ user: rec.user, name: rec.name }];
  }

  async _getByName({ name }: { name: string }): Promise<Array<{ user: string }>> {
    await this.connect();
    const rec = await this.collection.findOne({ name });
    if (!rec) return [];
    return [{ user: rec.user }];
  }

  async _getAllUsers(): Promise<Array<{ user: string; name: string }>> {
    await this.connect();
    const arr = await this.collection
      .find({}, { projection: { _id: 0, user: 1, name: 1 } })
      .toArray();
    return arr.map(({ user, name }) => ({ user, name }));
  }
}


