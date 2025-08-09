import { MongoClient, Db, Collection, ObjectId } from "mongodb";

export interface UserRecord {
  _id: ObjectId;
  user: string;
  name: string;
}

export class UserConcept {
  private db!: Db;
  private collection!: Collection<UserRecord>;

  constructor() {
    this.connect();
  }

  private async connect() {
    const connectionString = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(connectionString);
    await client.connect();
    this.db = client.db(process.env.MONGODB_DB || "quizzie");
    this.collection = this.db.collection<UserRecord>("users");
    
    // Create indexes for efficient lookups
    await this.collection.createIndex({ user: 1 }, { unique: true });
    await this.collection.createIndex({ name: 1 }, { unique: true });
  }

  async register({ name }: { name: string }): Promise<{ user: string } | { error: string }> {
    try {
      // Check if name already exists
      const existing = await this.collection.findOne({ name });
      if (existing) {
        return { error: "Name already taken" };
      }

      const user = new ObjectId().toString();
      const record: UserRecord = {
        _id: new ObjectId(),
        user,
        name
      };

      await this.collection.insertOne(record);
      return { user };
    } catch (error) {
      return { error: `Failed to register user: ${error}` };
    }
  }

  async updateName({ user, newName }: { user: string; newName: string }): Promise<{ user: string } | { error: string }> {
    try {
      // Check if user exists
      const userRecord = await this.collection.findOne({ user });
      if (!userRecord) {
        return { error: "User not found" };
      }

      // Check if newName is already taken by another user
      const nameExists = await this.collection.findOne({ name: newName, user: { $ne: user } });
      if (nameExists) {
        return { error: "Name already taken" };
      }

      await this.collection.updateOne({ user }, { $set: { name: newName } });
      return { user };
    } catch (error) {
      return { error: `Failed to update name: ${error}` };
    }
  }

  async _getById({ user }: { user: string }): Promise<Array<{ user: string; name: string }>> {
    try {
      const record = await this.collection.findOne({ user });
      return record ? [{ user: record.user, name: record.name }] : [];
    } catch (error) {
      return [];
    }
  }

  async _getByName({ name }: { name: string }): Promise<Array<{ user: string }>> {
    try {
      const record = await this.collection.findOne({ name });
      return record ? [{ user: record.user }] : [];
    } catch (error) {
      return [];
    }
  }

  async _getAllUsers(): Promise<Array<{ user: string; name: string }>> {
    try {
      const users = await this.collection.find({}).toArray();
      return users.map(u => ({ user: u.user, name: u.name }));
    } catch (error) {
      return [];
    }
  }
}
