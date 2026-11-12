import type {
  CurriculumAnswer,
  CurriculumContent,
  CurriculumContentCollection,
  CurriculumContentWeek,
  MyCurriculum,
} from '../index';

describe('curriculum types', () => {
  it('MyCurriculum carries the backend-sent progress including pct', () => {
    const curriculum: MyCurriculum = {
      id: 'cur-1',
      title: 'Curriculum',
      description: 'Pawn basics',
      level: { id: 'lvl-1', name: 'Pawn 1' },
      weeksToGraduate: 12,
      collectionCount: 24,
      progress: { completed: 10, total: 40, pct: 25, scoreAvg: 82, allComplete: false },
    };
    expect(curriculum.progress.pct).toBe(25);
    expect(curriculum.progress.scoreAvg).toBe(82);
    expect(curriculum.level.name).toBe('Pawn 1');
  });

  it('CurriculumContent nests weeks, collections, lesson and homework answers', () => {
    const answer: CurriculumAnswer = {
      positionIndex: 0,
      attempts: [
        { attemptNumber: 1, moves: ['e4'], isCorrect: true, score: 10, timeTaken: 5, answeredAt: '2027-03-08T15:00:00.000Z' },
      ],
      bestScore: 10,
      isCorrect: true,
      isCompleted: true,
    };
    const collection: CurriculumContentCollection = {
      id: 'col-a',
      title: 'Openings',
      description: '',
      order: 1,
      maxAttempts: 3,
      scorePerPosition: 10,
      lesson: { pgnContent: '1. e4 e5 *', videoUrl: '' },
      homework: {
        materialId: 'mat-1',
        totalPositions: 1,
        positionsCompleted: 1,
        answers: [answer],
        games: ['1. e4 *'],
      },
    };
    const week: CurriculumContentWeek = { week: 1, label: 'Week 1', collections: [collection] };
    const content: CurriculumContent = {
      id: 'cur-1',
      title: 'Curriculum',
      level: { id: 'lvl-1', name: 'Pawn 1' },
      weeksToGraduate: null,
      maxAttemptsDefault: 3,
      weeks: [week],
    };
    const read = content.weeks[0].collections[0];
    expect(read.lesson?.pgnContent).toBe('1. e4 e5 *');
    expect(read.homework?.answers[0].bestScore).toBe(10);
    expect(content.weeksToGraduate).toBeNull();
  });
});
