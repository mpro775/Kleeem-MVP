const Queue = require('bull');
const queue = new Queue('documents-processing-queue', 'redis://31.97.155.167:6379');

(async () => {
  const failed = await queue.getFailed();
  for (const job of failed) {
    console.log(`❌ Job ${job.id} failed:`, job.failedReason);
    // يمكنك أيضًا عرض stacktrace الكاملة إن أردت:
    // console.log(job.stacktrace);
  }
  process.exit();
})();
