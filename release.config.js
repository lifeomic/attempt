module.exports = {
  branches: ['master'],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/npm'],
    [
      '@semantic-release/github',
      {
        // Setting this to false disables the default behavior
        // of opening a GitHub issue when a release fails.
        // We can enable this later if we want.
        failComment: false,
      },
    ],
  ],
};
