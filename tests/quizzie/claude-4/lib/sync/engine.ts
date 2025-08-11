import { SyncConcept } from "../../engine/mod";
import { APIConcept } from "../../concepts/api";
import { UserConcept } from "../../concepts/user";
import { QuizConcept } from "../../concepts/quiz";
import { ActivationConcept } from "../../concepts/activation";
import { createApiQuizSyncs } from "../../syncs/api-quiz";

// Initialize sync engine
const Sync = new SyncConcept();

// Register concepts
const concepts = {
  API: new APIConcept(),
  User: new UserConcept(),
  Quiz: new QuizConcept(),
  Activation: new ActivationConcept(),
};

// Instrument for reactivity
const { API, User, Quiz, Activation } = Sync.instrument(concepts);

// Register synchronizations
const syncs = createApiQuizSyncs(API, Quiz, User, Activation);
Sync.register(syncs);

// Export for API routes
export { API, User, Quiz, Activation };
