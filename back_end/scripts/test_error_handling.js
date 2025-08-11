const axios = require('axios');

// Test script để kiểm tra luồng xử lý lỗi
async function testErrorHandling() {
  console.log("🧪 ===== BẮT ĐẦU TEST ERROR HANDLING =====");
  
  const testCases = [
    {
      name: "Test lỗi 429 - Rate Limit",
      data: {
        chapters: [
          {
            title: "Test Chapter",
            content: "This is a test content that should trigger rate limit error",
            chapterNumber: 1
          }
        ],
        model: {
          name: "gemini-2.0-flash-lite",
          value: "gemini-2.0-flash-lite"
        },
        storyId: "test-story-id"
      },
      expectedError: "429"
    },
    {
      name: "Test lỗi API key không hợp lệ",
      data: {
        chapters: [
          {
            title: "Test Chapter",
            content: "This is a test content",
            chapterNumber: 1
          }
        ],
        userKeys: ["invalid-api-key"],
        model: {
          name: "gemini-2.0-flash-lite",
          value: "gemini-2.0-flash-lite"
        },
        storyId: "test-story-id"
      },
      expectedError: "INVALID_API_KEY"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    
    try {
      const response = await axios.post('http://localhost:3000/translate', testCase.data, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });

      console.log("📥 Response:", {
        success: response.data.success,
        message: response.data.message,
        errorCount: response.data.errorCount,
        successCount: response.data.successCount,
        hasChapters: !!response.data.chapters,
        chaptersCount: response.data.chapters?.length || 0
      });

      if (response.data.chapters && response.data.chapters.length > 0) {
        const chapter = response.data.chapters[0];
        console.log("📋 Chapter data:", {
          hasError: chapter.hasError,
          error: chapter.error,
          hasTranslatedTitle: !!chapter.translatedTitle,
          hasTranslatedContent: !!chapter.translatedContent
        });
      }

      // Kiểm tra xem response có đúng format không
      if (testCase.expectedError) {
        if (response.data.success) {
          console.error("❌ TEST FAILED: Expected error but got success");
        } else {
          console.log("✅ TEST PASSED: Correctly returned error response");
        }
      } else {
        if (!response.data.success) {
          console.error("❌ TEST FAILED: Expected success but got error");
        } else {
          console.log("✅ TEST PASSED: Correctly returned success response");
        }
      }

    } catch (error) {
      console.error("❌ Request failed:", {
        status: error.response?.status,
        message: error.response?.data?.error || error.message
      });
    }
  }

  console.log("\n🧪 ===== HOÀN THÀNH TEST ERROR HANDLING =====");
}

// Chạy test
if (require.main === module) {
  testErrorHandling().catch(console.error);
}

module.exports = { testErrorHandling };
