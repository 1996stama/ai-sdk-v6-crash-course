import { runEvalite } from 'evalite/runner';

await runEvalite({
  cwd: import.meta.dirname,
  mode: 'watch-for-file-changes',
});
