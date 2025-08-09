import { actions, Frames, Vars } from "../engine/mod";
import { APIConcept } from "../concepts/api";
import { QuizConcept } from "../concepts/quiz";
import { UserConcept } from "../concepts/user";
import { ActivationConcept } from "../concepts/activation";

export function createApiQuizSyncs(
  API: APIConcept,
  Quiz: QuizConcept,
  User: UserConcept,
  Activation: ActivationConcept
) {
  // List quizzes for user
  const ListQuizzes = ({ request, quizzes }: Vars) => ({
    when: actions(
      [API.request, { method: "GET", path: "/api/quizzes" }, { request }]
    ),
    where: (frames: Frames): Frames => {
      return frames
        .query(Quiz._getQuizzesByOwner, { owner: "demo-user" }, { quizzes });
    },
    then: actions(
      [API.respond, { request, output: { quizzes } }]
    )
  });

  // Create quiz
  const CreateQuiz = ({ request, quiz }: Vars) => ({
    when: actions(
      [API.request, { method: "POST", path: "/api/quizzes" }, { request }]
    ),
    then: actions(
      [Quiz.createQuiz, { owner: "demo-user", title: "New Quiz" }, { quiz }],
      [API.respond, { request, output: { quiz } }]
    )
  });

  // Delete quiz
  const DeleteQuiz = ({ request }: Vars) => ({
    when: actions(
      [API.request, { method: "DELETE" }, { request }]
    ),
    then: actions(
      [API.respond, { request, output: {} }]
    )
  });

  // Get quiz details
  const GetQuiz = ({ request, quizData, questions }: Vars) => ({
    when: actions(
      [API.request, { method: "GET" }, { request }]
    ),
    where: (frames: Frames): Frames => {
      return frames
        .query(Quiz._getQuiz, { quiz: "test-quiz" }, { quizData })
        .query(Quiz._getQuestions, { quiz: "test-quiz" }, { questions });
    },
    then: actions(
      [API.respond, { request, output: { quiz: quizData, questions } }]
    )
  });

  // Add question to quiz
  const AddQuestion = ({ request, question }: Vars) => ({
    when: actions(
      [API.request, { method: "POST" }, { request }]
    ),
    then: actions(
      [Quiz.addQuestion, { quiz: "test-quiz", text: "New Question" }, { question }],
      [API.respond, { request, output: { question } }]
    )
  });

  // Activate question
  const ActivateQuestion = ({ request, activation }: Vars) => ({
    when: actions(
      [API.request, { method: "POST" }, { request }]
    ),
    then: actions(
      [Activation.activate, { question: "test-question" }, { activation }],
      [API.respond, { request, output: { activation } }]
    )
  });

  // Vote on activation
  const Vote = ({ request }: Vars) => ({
    when: actions(
      [API.request, { method: "POST" }, { request }]
    ),
    then: actions(
      [Activation.vote, { activation: "test-activation", user: "test-user", option: "test-option" }],
      [API.respond, { request, output: {} }]
    )
  });

  // Get activation data
  const GetActivation = ({ request, activationData, voteCounts }: Vars) => ({
    when: actions(
      [API.request, { method: "GET" }, { request }]
    ),
    where: (frames: Frames): Frames => {
      return frames
        .query(Activation._getActivation, { activation: "test-activation" }, { activationData })
        .query(Activation._getVoteCounts, { activation: "test-activation" }, { voteCounts });
    },
    then: actions(
      [API.respond, { request, output: { activation: activationData, votes: voteCounts } }]
    )
  });

  return {
    ListQuizzes,
    CreateQuiz,
    DeleteQuiz,
    GetQuiz,
    AddQuestion,
    ActivateQuestion,
    Vote,
    GetActivation
  };
}