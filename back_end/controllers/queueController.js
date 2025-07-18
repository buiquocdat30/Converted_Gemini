let callCount = 0;

const { myQueue } = require('../utils/queue');

// Lấy thống kê queue BullMQ
async function getQueueStats(req, res) {
  try {
    callCount++;
    const now = new Date().toISOString();
    console.log(`[QUEUE_STATS] Lần gọi thứ ${callCount} - Thời gian: ${now}`);
    const counts = await myQueue.getJobCounts();
    // counts: { waiting, active, completed, failed, delayed, paused }
    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê queue', error: err.message });
  }
}

module.exports = { getQueueStats }; 