# Giải pháp: Tải file lớn từ FE xuống BE với thanh tiến độ (Batching và Socket.IO)

Vấn đề: Tải xuống BE một file có hơn 1k chương (trong tương lai có thể 3k-4k chương), muốn hiển thị thanh tiến độ (ví dụ: 1/3000, 2/3000).

## I. Tổng quan giải pháp

Giải pháp tập trung vào việc chia nhỏ file lớn thành các "batch" (lô) chương nhỏ ở Frontend (FE), sau đó gửi từng batch lên Backend (BE) thông qua Socket.IO. Backend sẽ xử lý từng batch và gửi lại thông báo tiến độ cho FE. Điều này giúp giảm tải bộ nhớ, cải thiện khả năng phục hồi và mang lại trải nghiệm tốt hơn cho người dùng với thanh tiến độ trực quan.

## II. Các bước thực hiện và file cần sửa đổi

### 1. Frontend (FE)

**Mục tiêu:** Đọc file, chia thành các batch chương và gửi lên BE thông qua Socket.IO, đồng thời hiển thị tiến độ.

**File cần sửa/tạo:**

*   `front_end/src/utils/fileUpload.js` (hoặc tương tự, đây sẽ là file mới hoặc file hiện có chứa logic upload)
*   `front_end/src/components/UploadForm/UploadForm.jsx` (hoặc component tương tự chứa giao diện upload và gọi hàm xử lý)

**A. File: `front_end/src/utils/fileUpload.js`**

**Lý do sửa:** Chứa logic cốt lõi để xử lý file đầu vào, chia thành các phần và quản lý quá trình gửi dữ liệu lên server.

**Cách thức hoạt động của hàm/phần này:**

1.  **`readFileAsText(file)`:**
    *   Sử dụng `FileReader` để đọc nội dung file dưới dạng văn bản (nếu file là định dạng văn bản như `.txt`, `.epub` có thể đọc dưới dạng string hoặc ArrayBuffer tùy cách xử lý nội dung).
    *   **Chức năng:** Đọc file đầu vào.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        export const readFileAsText = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsText(file); // hoặc readAsArrayBuffer(file) tùy định dạng
            });
        };
        // ... existing code ...
        ```
2.  **`uploadFileInBatches(file, socket, onProgress)`:**
    *   **Mục đích:** Hàm chính để quản lý quá trình upload file theo batch.
    *   **Chức năng:**
        *   Nhận một `File` object, đối tượng `socket` từ `socket.io-client`, và một callback `onProgress` để cập nhật UI.
        *   Đọc nội dung file.
        *   Giả sử nội dung file có thể được phân tích thành các chương. Dựa vào cấu trúc file (ví dụ: EPUB, TXT), bạn cần một parser để tách các chương.
        *   Chia mảng các chương thành các batch có kích thước cố định (ví dụ: 10 chương/batch).
        *   Gửi từng batch qua Socket.IO.
        *   Lắng nghe các sự kiện phản hồi tiến độ từ server.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        // Giả định có một hàm parseFileToChapters(fileContent) trả về mảng các chương
        // import { parseFileToChapters } from './chapterParser'; // Cần tạo file này

        export const uploadFileInBatches = async (file, socket, onProgress) => {
            try {
                const fileContent = await readFileAsText(file);
                const chapters = parseFileToChapters(fileContent); // Hàm giả định
                const totalChapters = chapters.length;
                const batchSize = 10;
                let chaptersProcessed = 0;

                for (let i = 0; i < totalChapters; i += batchSize) {
                    const batch = chapters.slice(i, i + batchSize);
                    const batchIndex = Math.floor(i / batchSize);

                    // Gửi batch chương lên BE
                    socket.emit('upload_chapter_batch', {
                        fileName: file.name,
                        batchIndex: batchIndex,
                        batch: batch,
                        totalChapters: totalChapters,
                        totalBatches: Math.ceil(totalChapters / batchSize),
                    });

                    // Cập nhật tiến độ tạm thời ngay sau khi gửi (trước khi nhận phản hồi từ BE)
                    // Đây là ước tính ban đầu, tiến độ chính xác sẽ từ BE
                    chaptersProcessed += batch.length;
                    onProgress({
                        processed: Math.min(chaptersProcessed, totalChapters),
                        total: totalChapters,
                        status: 'uploading'
                    });

                    // Có thể thêm delay nhỏ giữa các batch để tránh quá tải BE nếu cần
                    // await new Promise(resolve => setTimeout(resolve, 50));
                }

                // Lắng nghe sự kiện tiến độ từ BE
                socket.on('upload_progress', (data) => {
                    onProgress({
                        processed: data.processedChapters,
                        total: data.totalChapters,
                        status: 'processing'
                    });
                });

                socket.on('upload_complete', (data) => {
                    onProgress({
                        processed: data.totalChapters,
                        total: data.totalChapters,
                        status: 'complete',
                        message: 'Tải lên và xử lý hoàn tất!'
                    });
                });

                socket.on('upload_error', (error) => {
                    onProgress({
                        status: 'error',
                        message: `Lỗi khi tải lên: ${error.message}`
                    });
                });

            } catch (error) {
                onProgress({ status: 'error', message: `Lỗi đọc file: ${error.message}` });
                console.error("Error during file upload:", error);
            }
        };
        // ... existing code ...
        ```
**B. File: `front_end/src/components/UploadForm/UploadForm.jsx`**

**Lý do sửa:** Giao diện người dùng để chọn file và hiển thị thanh tiến độ.

**Cách thức hoạt động của hàm/phần này:**

1.  **State Management:** Sử dụng `useState` để quản lý file được chọn, tiến độ tải lên (số chương đã xử lý, tổng số chương) và trạng thái upload.
2.  **Input File:** Một input HTML `type="file"` để người dùng chọn file.
3.  **Xử lý `onSubmit`:** Khi người dùng submit form hoặc chọn file, gọi hàm `uploadFileInBatches`.
4.  **Hiển thị Tiến độ:** Dựa vào state tiến độ, hiển thị thanh tiến độ và văn bản "X/Y".
    *   **Cơ chế:**
        ```jsx
        // ... existing code ...
        import React, { useState, useEffect } from 'react';
        import { io } from 'socket.io-client'; // Đã có trong package.json của FE
        import { uploadFileInBatches } from '../../utils/fileUpload'; // Import hàm đã tạo

        const UploadForm = () => {
            const [selectedFile, setSelectedFile] = useState(null);
            const [uploadProgress, setUploadProgress] = useState({
                processed: 0,
                total: 0,
                status: 'idle', // idle, uploading, processing, complete, error
                message: ''
            });
            const [socket, setSocket] = useState(null);

            useEffect(() => {
                // Kết nối Socket.IO khi component mount
                const newSocket = io('http://localhost:3000'); // Thay đổi URL BE của bạn
                setSocket(newSocket);

                // Ngắt kết nối khi component unmount
                return () => newSocket.disconnect();
            }, []);

            const handleFileChange = (event) => {
                setSelectedFile(event.target.files[0]);
                setUploadProgress({ processed: 0, total: 0, status: 'idle', message: '' }); // Reset progress
            };

            const handleUpload = async () => {
                if (!selectedFile || !socket) {
                    alert('Vui lòng chọn file và đảm bảo kết nối server.');
                    return;
                }

                setUploadProgress(prev => ({ ...prev, status: 'uploading', message: 'Đang tải lên...' }));

                await uploadFileInBatches(selectedFile, socket, (progress) => {
                    setUploadProgress(progress);
                });
            };

            const progressBarWidth = uploadProgress.total > 0 ?
                (uploadProgress.processed / uploadProgress.total) * 100 : 0;

            return (
                <div>
                    <h2>Tải lên File Chương</h2>
                    <input type="file" onChange={handleFileChange} />
                    <button onClick={handleUpload} disabled={!selectedFile || uploadProgress.status === 'uploading' || uploadProgress.status === 'processing'}>
                        Tải lên
                    </button>

                    {uploadProgress.status !== 'idle' && (
                        <div>
                            <p>Trạng thái: {uploadProgress.message || uploadProgress.status}</p>
                            <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '5px' }}>
                                <div
                                    style={{
                                        width: `${progressBarWidth}%`,
                                        backgroundColor: '#4CAF50',
                                        height: '20px',
                                        borderRadius: '5px',
                                        textAlign: 'center',
                                        color: 'white'
                                    }}
                                >
                                    {uploadProgress.total > 0 ?
                                        `${uploadProgress.processed}/${uploadProgress.total}` : ''}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        export default UploadForm;
        // ... existing code ...
        ```

### 2. Backend (BE)

**Mục tiêu:** Nhận các batch chương qua Socket.IO, xử lý chúng, lưu vào database và gửi lại tiến độ.

**File cần sửa/tạo:**

*   `back_end/socket.js` (file hiện có)
*   `back_end/controllers/uploadController.js` (file mới)
*   `back_end/services/chapterProcessingService.js` (file mới, có thể nằm trong thư mục `services`)
*   `back_end/utils/worker.js` (file hiện có, nơi BullMQ worker hoạt động)
*   `back_end/index.js` (file hiện có, điểm khởi chạy server)

**A. File: `back_end/socket.js`**

**Lý do sửa:** Thiết lập lắng nghe sự kiện từ FE và gửi thông báo tiến độ.

**Cách thức hoạt động của hàm/phần này:**

1.  **Khởi tạo Socket.IO Server:** Đảm bảo server được khởi tạo và liên kết với HTTP server chính (thường là Express app).
2.  **Sử dụng Redis Adapter:** Cho phép nhiều instance của Socket.IO server chia sẻ trạng thái và Pub/Sub, quan trọng cho việc scaling.
3.  **Lắng nghe sự kiện `connection`:** Khi một client kết nối, thiết lập các lắng nghe sự kiện riêng cho client đó.
4.  **Lắng nghe sự kiện `upload_chapter_batch`:** Khi nhận được một batch từ FE, chuyển nó đến một controller để xử lý.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        const express = require('express');
        const http = require('http');
        const { Server } = require('socket.io');
        const { createAdapter } = require('@socket.io/redis-adapter');
        const { createClient } = require('redis'); // Đã có redis trong package.json
        const uploadController = require('./controllers/uploadController'); // Tạo file này

        const app = express();
        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: "*", // Cần cấu hình chặt chẽ hơn trong môi trường production
                methods: ["GET", "POST"]
            }
        });

        // Cấu hình Redis Adapter
        const pubClient = createClient({ url: "redis://localhost:6379" }); // Thay đổi nếu Redis ở nơi khác
        const subClient = pubClient.duplicate();

        Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
            io.adapter(createAdapter(pubClient, subClient));
            console.log("Socket.IO connected to Redis.");
        }).catch(err => {
            console.error("Failed to connect Socket.IO to Redis:", err);
        });

        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            // Xử lý sự kiện upload_chapter_batch
            socket.on('upload_chapter_batch', (data) => {
                console.log(`Received batch ${data.batchIndex} for file ${data.fileName}`);
                // Chuyển việc xử lý sang controller và truyền đối tượng io để gửi tiến độ
                uploadController.handleChapterBatch(data, io);
            });

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });

        // Export io để các module khác có thể sử dụng (ví dụ: để gửi thông báo tiến độ)
        module.exports = { app, server, io };
        // ... existing code ...
        ```
**B. File: `back_end/controllers/uploadController.js` (File mới)**

**Lý do sửa:** Xử lý logic nghiệp vụ cho từng batch chương nhận được và quản lý việc đưa vào hàng đợi xử lý.

**Cách thức hoạt động của hàm/phần này:**

1.  **`handleChapterBatch(data, io)`:**
    *   **Mục đích:** Xử lý một batch chương từ FE.
    *   **Chức năng:**
        *   Nhận `data` (chứa `fileName`, `batchIndex`, `batch`, `totalChapters`, `totalBatches`) và đối tượng `io` của Socket.IO.
        *   Tạm thời lưu trữ các batch này (ví dụ: vào một biến Map hoặc một thư mục tạm thời nếu cần ghép file).
        *   Khi phát hiện tất cả các batch cho một file đã được nhận (dựa vào `totalBatches` và số batch đã nhận), tạo một job cho `bullmq` để xử lý file đầy đủ.
        *   Quan trọng: Gửi thông báo tiến độ qua `io.emit('upload_progress', ...)` ngay lập tức sau khi nhận và xác nhận một batch, hoặc sau khi một phần của file đã được xử lý thành công.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        const { Queue } = require('bullmq'); // Đã có bullmq trong package.json
        const chapterProcessingService = require('../services/chapterProcessingService'); // Tạo file này
        const redisClient = require('../redisClient'); // Đã có redisClient.js

        // Sử dụng một Map để theo dõi các batch của mỗi file đang được upload
        const uploadingFiles = new Map(); // Map<fileName, { receivedBatches: Set<batchIndex>, totalChapters: number, accumulatedChapters: Chapter[] }>

        // Khởi tạo queue cho việc xử lý chương
        const chapterQueue = new Queue('chapterProcessingQueue', { connection: redisClient.duplicate() });

        const handleChapterBatch = async (data, io) => {
            const { fileName, batchIndex, batch, totalChapters, totalBatches } = data;

            if (!uploadingFiles.has(fileName)) {
                uploadingFiles.set(fileName, {
                    receivedBatches: new Set(),
                    totalChapters: totalChapters,
                    accumulatedChapters: [] // Accumulate chapters for this file
                });
            }

            const fileData = uploadingFiles.get(fileName);
            if (!fileData.receivedBatches.has(batchIndex)) {
                fileData.receivedBatches.add(batchIndex);
                fileData.accumulatedChapters.push(...batch);

                console.log(`File: ${fileName}, Batch: ${batchIndex}/${totalBatches}, Accumulated: ${fileData.accumulatedChapters.length}/${totalChapters}`);

                // Gửi tiến độ về FE dựa trên số chương đã nhận
                io.emit('upload_progress', {
                    fileName: fileName,
                    processedChapters: fileData.accumulatedChapters.length,
                    totalChapters: totalChapters,
                    status: 'received'
                });

                // Kiểm tra xem đã nhận đủ tất cả các batch chưa
                if (fileData.receivedBatches.size === totalBatches) {
                    console.log(`All batches received for file: ${fileName}. Adding to processing queue.`);
                    await chapterQueue.add('processChapters', {
                        fileName: fileName,
                        chapters: fileData.accumulatedChapters,
                        totalChapters: totalChapters
                    });
                    uploadingFiles.delete(fileName); // Xóa khỏi map sau khi thêm vào queue
                }
            }
        };

        module.exports = { handleChapterBatch };
        // ... existing code ...
        ```
**C. File: `back_end/services/chapterProcessingService.js` (File mới)**

**Lý do sửa:** Chứa logic nghiệp vụ để lưu các chương vào database.

**Cách thức hoạt động của hàm/phần này:**

1.  **`processAndSaveChapters(fileName, chapters, totalChapters, io)`:**
    *   **Mục đích:** Xử lý và lưu các chương vào database.
    *   **Chức năng:**
        *   Nhận `fileName`, mảng `chapters`, `totalChapters`, và đối tượng `io` (để gửi tiến độ).
        *   Lặp qua từng chương hoặc nhóm chương.
        *   Với mỗi chương/nhóm, lưu vào database (sử dụng Prisma).
        *   Sau mỗi `N` chương được lưu (ví dụ: 10 chương), gửi thông báo tiến độ qua `io.emit('upload_progress', ...)` để FE cập nhật.
        *   Khi hoàn tất, gửi thông báo `upload_complete`.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        const { PrismaClient } = require('@prisma/client'); // Đã có @prisma/client trong package.json
        const prisma = new PrismaClient();

        const processAndSaveChapters = async (jobData, io) => {
            const { fileName, chapters, totalChapters } = jobData;
            console.log(`Starting processing for file: ${fileName} with ${chapters.length} chapters.`);

            let chaptersSaved = 0;
            const batchSizeForDb = 50; // Lưu 50 chương một lúc vào DB

            for (let i = 0; i < chapters.length; i += batchSizeForDb) {
                const chapterBatch = chapters.slice(i, i + batchSizeForDb);

                // Giả định có model Chapter trong Prisma schema của bạn
                // await prisma.chapter.createMany({
                //     data: chapterBatch.map(chapter => ({
                //         title: chapter.title,
                //         content: chapter.content,
                //         storyFileName: fileName, // Liên kết với file gốc
                //         chapterNumber: chapter.number // Giả định chapter có thuộc tính number
                //     }))
                // });

                // Dùng setTimeout để mô phỏng quá trình xử lý DB
                await new Promise(resolve => setTimeout(resolve, 100));

                chaptersSaved += chapterBatch.length;

                // Gửi tiến độ xử lý về FE
                io.emit('upload_progress', {
                    fileName: fileName,
                    processedChapters: chaptersSaved,
                    totalChapters: totalChapters,
                    status: 'saving'
                });
                console.log(`Saved ${chaptersSaved}/${totalChapters} for ${fileName}`);
            }

            console.log(`Finished processing and saving for file: ${fileName}`);
            io.emit('upload_complete', {
                fileName: fileName,
                totalChapters: totalChapters,
                message: 'Xử lý file hoàn tất!'
            });
        };

        module.exports = { processAndSaveChapters };
        // ... existing code ...
        ```
**D. File: `back_end/utils/worker.js`**

**Lý do sửa:** Thiết lập BullMQ worker để thực thi các job xử lý chương đã được đưa vào hàng đợi.

**Cách thức hoạt động của hàm/phần này:**

1.  **Khởi tạo Worker:** Kết nối đến Redis và lắng nghe queue `chapterProcessingQueue`.
2.  **Xử lý Job:** Khi một job được nhận, gọi hàm `processAndSaveChapters` từ service.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        const { Worker } = require('bullmq'); // Đã có bullmq trong package.json
        const redisClient = require('../redisClient'); // Import redisClient
        const { processAndSaveChapters } = require('../services/chapterProcessingService'); // Import service

        const worker = new Worker('chapterProcessingQueue', async (job) => {
            console.log(`Processing job ${job.id} of type ${job.name}`);
            const io = require('../socket').io; // Lấy đối tượng io đã export từ socket.js

            // Truyền đối tượng io vào service để có thể emit sự kiện tiến độ
            await processAndSaveChapters(job.data, io);
            console.log(`Job ${job.id} completed.`);
        }, { connection: redisClient.duplicate() }); // Sử dụng kết nối Redis

        worker.on('completed', job => {
            console.log(`Job ${job.id} has completed!`);
        });

        worker.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed with error ${err.message}`);
        });

        console.log('BullMQ worker started.');
        // ... existing code ...
        ```
**E. File: `back_end/index.js`**

**Lý do sửa:** Đảm bảo Socket.IO server được khởi chạy cùng với Express app.

**Cách thức hoạt động của hàm/phần này:**

1.  **Import và sử dụng `socket.js`:** Thay vì khởi tạo Express và HTTP server trực tiếp, import `app` và `server` từ `socket.js`.
    *   **Cơ chế:**
        ```javascript
        // ... existing code ...
        const { app, server } = require('./socket'); // Import app và server từ socket.js

        // ... các middleware và route khác của Express app ...

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        // ... existing code ...
        ```

## III. Đánh giá và Lợi ích

*   **Giảm tải xử lý đồng thời:** Bằng cách chia batch và sử dụng BullMQ, Backend sẽ xử lý các tác vụ nặng (phân tích, lưu DB) một cách bất đồng bộ, giảm áp lực lên main thread của server.
*   **Hiển thị tiến độ rõ ràng:** Người dùng sẽ thấy được quá trình tải lên và xử lý, cải thiện trải nghiệm đáng kể cho file lớn.
*   **Khả năng phục hồi:** Nếu kết nối bị gián đoạn, bạn có thể triển khai logic để tiếp tục tải lên từ batch cuối cùng đã hoàn tất (cần lưu trạng thái upload ở FE hoặc BE).
*   **Khả năng mở rộng (Scalability):** Với Redis Adapter và BullMQ, bạn có thể dễ dàng chạy nhiều instance của BE server và worker để tăng khả năng xử lý.

## IV. Lưu ý thêm

*   **Xử lý lỗi:** Cần thêm cơ chế xử lý lỗi mạnh mẽ hơn cho cả quá trình upload và xử lý file (ví dụ: retry, log lỗi chi tiết).
*   **Xác thực và phân quyền:** Đảm bảo rằng chỉ những người dùng được phép mới có thể upload file.
*   **Bảo mật:** Với Socket.IO, cần cấu hình CORS và các biện pháp bảo mật khác phù hợp cho môi trường production.
*   **Parser EPUB/TXT:** Để tách chương từ file EPUB hoặc TXT, bạn cần một thư viện hoặc viết parser tùy chỉnh (ví dụ: `epubjs` ở FE có thể giúp đọc EPUB, nhưng để gửi từng chương thì bạn sẽ phải extract nội dung và chia nhỏ).
