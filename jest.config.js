/** Jest da API. Testes em test/ (API e banco) e *.spec.ts em src/ (unidade). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|test)\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { warnOnly: false } }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Testcontainers sobe um Postgres real por arquivo de teste.
  testTimeout: 180000,
  // Arquivos de banco em sequência: cada um sobe o seu container.
  maxWorkers: 1,
};
