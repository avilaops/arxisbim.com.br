// Config temporaria: mesma suite, apontando para o Postgres 18.6 local (5446).
import base from './vitest.config';

export default {
  ...base,
  test: {
    ...base.test,
    env: { ...base.test.env, DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5446/arxisvr_test' },
  },
};
