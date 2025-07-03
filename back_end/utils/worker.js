const { Worker, connection } = require('./queue');

const worker = new Worker('my-queue', async job => {
  // Xử lý công việc ở đây
  console.log('Xử lý job:', job.name, job.data);
  // ... logic xử lý ...
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} đã hoàn thành!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} thất bại:`, err);
}); 