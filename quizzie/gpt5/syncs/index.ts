import type { Vars, SyncFunctionMap } from '../../gpt5/engine/mod';
import { actions, Frames } from '../../gpt5/engine/mod';
import { APIConcept } from '../concepts/api';
import { QuizConcept } from '../concepts/quiz';
import { UserConcept } from '../concepts/user';
import { ActivationConcept } from '../concepts/activation';

export function createSyncs(
  API: APIConcept,
  Quiz: QuizConcept,
  User: UserConcept,
  Activation: ActivationConcept,
): SyncFunctionMap {
  return {
    ListQuizzes: (vars: Vars) => {
      const { request, quizzes, response } = vars;
      return {
        when: actions(
          [API.request, { method: 'GET', path: '/api/quizzes' }, { request }],
        ),
        where: async (frames: Frames) => {
          const out = new Frames();
          for (const frame of frames) {
            const items = await Quiz._getQuizzesByOwner({ owner: 'demo' });
            out.push({
              ...frame,
              [quizzes]: items,
              [response]: { ok: true, quizzes: items },
            } as any);
          }
          return out;
        },
        then: actions(
          [API.respond, { request, output: response }],
        ),
      };
    },

    CreateQuiz: (vars: Vars) => {
      const { request, quiz, title, response } = vars;
      return {
        when: actions(
          [API.request, { method: 'POST', path: '/api/quizzes', title }, { request }],
        ),
        where: async (frames: Frames) => {
          const out = new Frames();
          for (const frame of frames) {
            const t = frame[title] as unknown as string;
            const created = await Quiz.createQuiz({ owner: 'demo', title: t });
            if ('error' in created) {
              out.push({ ...frame, [response]: { ok: false, error: created.error } } as any);
            } else {
              out.push({
                ...frame,
                [quiz]: created.quiz,
                [response]: { ok: true, quiz: created.quiz },
              } as any);
            }
          }
          return out;
        },
        then: actions(
          [API.respond, { request, output: response }],
        ),
      };
    },

    DeleteQuiz: (vars: Vars) => {
      const { request, quiz, response } = vars;
      return {
        when: actions(
          [API.request, { method: 'DELETE', path: '/api/quizzes', quiz }, { request }],
        ),
        where: async (frames: Frames) => {
          const out = new Frames();
          for (const frame of frames) {
            const id = frame[quiz] as unknown as string;
            const res = await Quiz.deleteQuiz({ quiz: id });
            if ('error' in res) {
              out.push({ ...frame, [response]: { ok: false, error: res.error } } as any);
            } else {
              out.push({ ...frame, [response]: { ok: true, quiz: id } } as any);
            }
          }
          return out;
        },
        then: actions([API.respond, { request, output: response }]),
      };
    },
  };
}


