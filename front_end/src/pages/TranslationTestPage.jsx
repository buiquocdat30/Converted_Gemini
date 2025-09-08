// File test để kiểm tra luồng dữ liệu từ FE->BE->FE cho translateRangePage và translateAllPages
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { translateRangePages, parsePageInput, calculatePageRange, getPageInfo } from '../services/translateRangePage';
import { translateAllPages, analyzePageStatus, calculateEstimatedCost } from '../services/translateAllPages';
import { API_URL } from '../config/config';

const TranslationTestPage = () => {
  // State cho test data
  const [testData, setTestData] = useState({
    chapters: [],
    apiKey: '',
    model: null,
    storyId: 'test-story-123',
    userData: { id: 'test-user-456' }
  });

  // State cho test results
  const [testResults, setTestResults] = useState({
    rangePageTest: null,
    allPagesTest: null,
    isLoading: false,
    error: null
  });

  // State cho UI controls
  const [pageInput, setPageInput] = useState('12,16,18');
  const [rangeInput, setRangeInput] = useState('14-19');
  const [forceTranslate, setForceTranslate] = useState(false);
  const [maxPagesPerBatch, setMaxPagesPerBatch] = useState(5);

  // Mock data cho test
  const mockChapters = [
    { id: 1, chapterNumber: 1, chapterName: 'Chương 1', rawText: 'Nội dung chương 1', content: 'Nội dung chương 1', translatedContent: null },
    { id: 2, chapterNumber: 2, chapterName: 'Chương 2', rawText: 'Nội dung chương 2', content: 'Nội dung chương 2', translatedContent: null },
    { id: 3, chapterNumber: 3, chapterName: 'Chương 3', rawText: 'Nội dung chương 3', content: 'Nội dung chương 3', translatedContent: null },
    { id: 4, chapterNumber: 4, chapterName: 'Chương 4', rawText: 'Nội dung chương 4', content: 'Nội dung chương 4', translatedContent: null },
    { id: 5, chapterNumber: 5, chapterName: 'Chương 5', rawText: 'Nội dung chương 5', content: 'Nội dung chương 5', translatedContent: null },
    { id: 6, chapterNumber: 6, chapterName: 'Chương 6', rawText: 'Nội dung chương 6', content: 'Nội dung chương 6', translatedContent: null },
    { id: 7, chapterNumber: 7, chapterName: 'Chương 7', rawText: 'Nội dung chương 7', content: 'Nội dung chương 7', translatedContent: null },
    { id: 8, chapterNumber: 8, chapterName: 'Chương 8', rawText: 'Nội dung chương 8', content: 'Nội dung chương 8', translatedContent: null },
    { id: 9, chapterNumber: 9, chapterName: 'Chương 9', rawText: 'Nội dung chương 9', content: 'Nội dung chương 9', translatedContent: null },
    { id: 10, chapterNumber: 10, chapterName: 'Chương 10', rawText: 'Nội dung chương 10', content: 'Nội dung chương 10', translatedContent: null },
    { id: 11, chapterNumber: 11, chapterName: 'Chương 11', rawText: 'Nội dung chương 11', content: 'Nội dung chương 11', translatedContent: null },
    { id: 12, chapterNumber: 12, chapterName: 'Chương 12', rawText: 'Nội dung chương 12', content: 'Nội dung chương 12', translatedContent: null },
    { id: 13, chapterNumber: 13, chapterName: 'Chương 13', rawText: 'Nội dung chương 13', content: 'Nội dung chương 13', translatedContent: null },
    { id: 14, chapterNumber: 14, chapterName: 'Chương 14', rawText: 'Nội dung chương 14', content: 'Nội dung chương 14', translatedContent: null },
    { id: 15, chapterNumber: 15, chapterName: 'Chương 15', rawText: 'Nội dung chương 15', content: 'Nội dung chương 15', translatedContent: null },
    { id: 16, chapterNumber: 16, chapterName: 'Chương 16', rawText: 'Nội dung chương 16', content: 'Nội dung chương 16', translatedContent: null },
    { id: 17, chapterNumber: 17, chapterName: 'Chương 17', rawText: 'Nội dung chương 17', content: 'Nội dung chương 17', translatedContent: null },
    { id: 18, chapterNumber: 18, chapterName: 'Chương 18', rawText: 'Nội dung chương 18', content: 'Nội dung chương 18', translatedContent: null },
    { id: 19, chapterNumber: 19, chapterName: 'Chương 19', rawText: 'Nội dung chương 19', content: 'Nội dung chương 19', translatedContent: null },
    { id: 20, chapterNumber: 20, chapterName: 'Chương 20', rawText: 'Nội dung chương 20', content: 'Nội dung chương 20', translatedContent: null }
  ];

  const mockModel = {
    value: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    name: 'GPT-3.5 Turbo',
    rpm: 60,
    tpm: 90000,
    rpd: 1000
  };

  // Initialize test data
  useEffect(() => {
    setTestData(prev => ({
      ...prev,
      chapters: mockChapters,
      model: mockModel,
      apiKey: 'test-api-key-123'
    }));
  }, []);

  // Test function cho translateRangePages
  const testTranslateRangePages = async () => {
    console.log('🧪 [TEST] Bắt đầu test translateRangePages');
    setTestResults(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Parse page input
      const pageNumbers = parsePageInput(pageInput);
      console.log('🧪 [TEST] Parsed page numbers:', pageNumbers);

      // Test helper functions
      const pageRange = calculatePageRange(14, 19);
      console.log('🧪 [TEST] Page range 14-19:', pageRange);

      const pageInfo = getPageInfo(2, testData.chapters.length);
      console.log('🧪 [TEST] Page 2 info:', pageInfo);

      // Mock callbacks
      const mockCallbacks = {
        setResults: (results) => console.log('🧪 [TEST] setResults called:', results),
        setTranslatedCount: (count) => console.log('🧪 [TEST] setTranslatedCount called:', count),
        setErrorMessages: (errors) => console.log('🧪 [TEST] setErrorMessages called:', errors),
        onTranslationResult: (index, translated, title, duration) => 
          console.log('🧪 [TEST] onTranslationResult called:', { index, translated: translated?.slice(0, 50), title, duration }),
        onPageStartProgress: (pageNumber) => console.log('🧪 [TEST] onPageStartProgress called:', pageNumber),
        onPageStopProgress: (pageNumber) => console.log('🧪 [TEST] onPageStopProgress called:', pageNumber),
        onUpdateTotalProgress: (progress) => console.log('🧪 [TEST] onUpdateTotalProgress called:', progress),
        getPageStatus: (pageNumber) => 'PENDING',
        onBatchCancel: (batchIndex) => console.log('🧪 [TEST] onBatchCancel called:', batchIndex),
        setPageProgresses: (progresses) => console.log('🧪 [TEST] setPageProgresses called:', progresses),
        setPageTranslatingStates: (states) => console.log('🧪 [TEST] setPageTranslatingStates called:', states),
        setPageStatus: (status) => console.log('🧪 [TEST] setPageStatus called:', status)
      };

      // Call translateRangePages
      const result = await translateRangePages({
        pageNumbers,
        chapters: testData.chapters,
        apiKey: testData.apiKey,
        model: testData.model,
        storyId: testData.storyId,
        userData: testData.userData,
        ...mockCallbacks
      });

      console.log('🧪 [TEST] translateRangePages result:', result);
      setTestResults(prev => ({ 
        ...prev, 
        rangePageTest: result, 
        isLoading: false 
      }));

      toast.success(`✅ Test translateRangePages thành công! ${result.successfulPages}/${result.totalPages} trang`);

    } catch (error) {
      console.error('🧪 [TEST] translateRangePages error:', error);
      setTestResults(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`❌ Test translateRangePages thất bại: ${error.message}`);
    }
  };

  // Test function cho translateAllPages
  const testTranslateAllPages = async () => {
    console.log('🧪 [TEST] Bắt đầu test translateAllPages');
    setTestResults(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Test helper functions
      const pageAnalysis = analyzePageStatus(testData.chapters, (index) => {
        const chapter = testData.chapters[index];
        return chapter?.translatedContent ? 'COMPLETE' : 'PENDING';
      });
      console.log('🧪 [TEST] Page analysis:', pageAnalysis);

      const costEstimation = calculateEstimatedCost(testData.chapters, pageAnalysis.pagesNeedingTranslation);
      console.log('🧪 [TEST] Cost estimation:', costEstimation);

      // Mock callbacks
      const mockCallbacks = {
        setResults: (results) => console.log('🧪 [TEST] setResults called:', results),
        setTranslatedCount: (count) => console.log('🧪 [TEST] setTranslatedCount called:', count),
        setErrorMessages: (errors) => console.log('🧪 [TEST] setErrorMessages called:', errors),
        onTranslationResult: (index, translated, title, duration) => 
          console.log('🧪 [TEST] onTranslationResult called:', { index, translated: translated?.slice(0, 50), title, duration }),
        onPageStartProgress: (pageNumber) => console.log('🧪 [TEST] onPageStartProgress called:', pageNumber),
        onPageStopProgress: (pageNumber) => console.log('🧪 [TEST] onPageStopProgress called:', pageNumber),
        onUpdateTotalProgress: (progress) => console.log('🧪 [TEST] onUpdateTotalProgress called:', progress),
        getPageStatus: (pageNumber) => 'PENDING',
        getChapterStatus: (index) => {
          const chapter = testData.chapters[index];
          return chapter?.translatedContent ? 'COMPLETE' : 'PENDING';
        },
        onBatchCancel: (batchIndex) => console.log('🧪 [TEST] onBatchCancel called:', batchIndex),
        setPageProgresses: (progresses) => console.log('🧪 [TEST] setPageProgresses called:', progresses),
        setPageTranslatingStates: (states) => console.log('🧪 [TEST] setPageTranslatingStates called:', states),
        setPageStatus: (status) => console.log('🧪 [TEST] setPageStatus called:', status)
      };

      // Call translateAllPages
      const result = await translateAllPages({
        chapters: testData.chapters,
        apiKey: testData.apiKey,
        model: testData.model,
        storyId: testData.storyId,
        userData: testData.userData,
        forceTranslate: forceTranslate,
        maxPagesPerBatch: maxPagesPerBatch,
        ...mockCallbacks
      });

      console.log('🧪 [TEST] translateAllPages result:', result);
      setTestResults(prev => ({ 
        ...prev, 
        allPagesTest: result, 
        isLoading: false 
      }));

      toast.success(`✅ Test translateAllPages thành công! ${result.successfulPages}/${result.totalPages} trang`);

    } catch (error) {
      console.error('🧪 [TEST] translateAllPages error:', error);
      setTestResults(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`❌ Test translateAllPages thất bại: ${error.message}`);
    }
  };

  // Test backend endpoints directly
  const testBackendEndpoints = async () => {
    console.log('🧪 [TEST] Bắt đầu test backend endpoints trực tiếp');
    setTestResults(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = localStorage.getItem("auth-token") || "test-token";

      // Test range-pages endpoint
      console.log('🧪 [TEST] Testing /translate/range-pages endpoint');
      const rangePagesResponse = await fetch(`${API_URL}/translate/range-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageNumbers: [1, 2],
          chapters: testData.chapters.slice(0, 20).map(ch => ({
            title: ch.chapterName,
            content: ch.rawText,
            chapterNumber: ch.chapterNumber
          })),
          userKeys: [testData.apiKey],
          model: testData.model,
          storyId: testData.storyId,
          userId: testData.userData.id,
          isBatchTranslation: true
        })
      });

      const rangePagesResult = await rangePagesResponse.json();
      console.log('🧪 [TEST] Range pages endpoint response:', rangePagesResult);

      // Test all-pages endpoint
      console.log('🧪 [TEST] Testing /translate/all-pages endpoint');
      const allPagesResponse = await fetch(`${API_URL}/translate/all-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chapters: testData.chapters.slice(0, 20).map(ch => ({
            title: ch.chapterName,
            content: ch.rawText,
            chapterNumber: ch.chapterNumber
          })),
          userKeys: [testData.apiKey],
          model: testData.model,
          storyId: testData.storyId,
          userId: testData.userData.id,
          isBatchTranslation: true,
          forceTranslate: false,
          maxPagesPerBatch: 3
        })
      });

      const allPagesResult = await allPagesResponse.json();
      console.log('🧪 [TEST] All pages endpoint response:', allPagesResult);

      setTestResults(prev => ({ 
        ...prev, 
        rangePageTest: rangePagesResult,
        allPagesTest: allPagesResult,
        isLoading: false 
      }));

      toast.success('✅ Test backend endpoints thành công!');

    } catch (error) {
      console.error('🧪 [TEST] Backend endpoints error:', error);
      setTestResults(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`❌ Test backend endpoints thất bại: ${error.message}`);
    }
  };

  // Clear test results
  const clearResults = () => {
    setTestResults({
      rangePageTest: null,
      allPagesTest: null,
      isLoading: false,
      error: null
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Translation Test Page</h1>
      <p>Test luồng dữ liệu từ Frontend → Backend → Frontend cho translateRangePage và translateAllPages</p>

      {/* Test Configuration */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>⚙️ Test Configuration</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label>📄 Page Input (VD: "12,16,18"): </label>
          <input 
            type="text" 
            value={pageInput} 
            onChange={(e) => setPageInput(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>📊 Range Input (VD: "14-19"): </label>
          <input 
            type="text" 
            value={rangeInput} 
            onChange={(e) => setRangeInput(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={forceTranslate} 
              onChange={(e) => setForceTranslate(e.target.checked)}
              style={{ marginRight: '10px' }}
            />
            🔄 Force Translate (dịch lại trang đã dịch)
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>📦 Max Pages Per Batch: </label>
          <input 
            type="number" 
            value={maxPagesPerBatch} 
            onChange={(e) => setMaxPagesPerBatch(parseInt(e.target.value))}
            style={{ marginLeft: '10px', padding: '5px', width: '100px' }}
            min="1"
            max="10"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>📊 Test Data:</strong>
          <ul>
            <li>Chapters: {testData.chapters.length}</li>
            <li>Model: {testData.model?.label}</li>
            <li>Story ID: {testData.storyId}</li>
            <li>User ID: {testData.userData.id}</li>
            <li>API Key: {testData.apiKey ? '✅ Có' : '❌ Không'}</li>
          </ul>
        </div>
      </div>

      {/* Test Buttons */}
      <div style={{ marginBottom: '30px' }}>
        <h2>🚀 Test Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={testTranslateRangePages}
            disabled={testResults.isLoading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: testResults.isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {testResults.isLoading ? '⏳ Loading...' : '🧪 Test Range Pages'}
          </button>

          <button 
            onClick={testTranslateAllPages}
            disabled={testResults.isLoading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: testResults.isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {testResults.isLoading ? '⏳ Loading...' : '🧪 Test All Pages'}
          </button>

          <button 
            onClick={testBackendEndpoints}
            disabled={testResults.isLoading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '5px',
              cursor: testResults.isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {testResults.isLoading ? '⏳ Loading...' : '🔗 Test Backend Direct'}
          </button>

          <button 
            onClick={clearResults}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Results
          </button>
        </div>
      </div>

      {/* Error Display */}
      {testResults.error && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb', 
          borderRadius: '5px' 
        }}>
          <h3>❌ Error</h3>
          <pre>{testResults.error}</pre>
        </div>
      )}

      {/* Test Results */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Range Pages Test Results */}
        <div style={{ 
          flex: '1', 
          minWidth: '400px', 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>📄 Range Pages Test Results</h3>
          {testResults.rangePageTest ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Status:</strong> 
                <span style={{ 
                  color: testResults.rangePageTest.success ? 'green' : 'red',
                  marginLeft: '10px'
                }}>
                  {testResults.rangePageTest.success ? '✅ Success' : '❌ Failed'}
                </span>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Message:</strong> {testResults.rangePageTest.message}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Total Pages:</strong> {testResults.rangePageTest.totalPages}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Successful Pages:</strong> {testResults.rangePageTest.successfulPages}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Total Jobs:</strong> {testResults.rangePageTest.totalJobs}
              </div>
              {testResults.rangePageTest.timing && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Timing:</strong>
                  <pre style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(testResults.rangePageTest.timing, null, 2)}
                  </pre>
                </div>
              )}
              {testResults.rangePageTest.errors && testResults.rangePageTest.errors.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Errors:</strong>
                  <ul>
                    {testResults.rangePageTest.errors.map((error, index) => (
                      <li key={index} style={{ color: 'red' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <details>
                <summary>📋 Full Response</summary>
                <pre style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
                  {JSON.stringify(testResults.rangePageTest, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>Chưa có kết quả test</p>
          )}
        </div>

        {/* All Pages Test Results */}
        <div style={{ 
          flex: '1', 
          minWidth: '400px', 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>📚 All Pages Test Results</h3>
          {testResults.allPagesTest ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Status:</strong> 
                <span style={{ 
                  color: testResults.allPagesTest.success ? 'green' : 'red',
                  marginLeft: '10px'
                }}>
                  {testResults.allPagesTest.success ? '✅ Success' : '❌ Failed'}
                </span>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Message:</strong> {testResults.allPagesTest.message}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Total Pages:</strong> {testResults.allPagesTest.totalPages}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Successful Pages:</strong> {testResults.allPagesTest.successfulPages}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Total Jobs:</strong> {testResults.allPagesTest.totalJobs}
              </div>
              {testResults.allPagesTest.pageAnalysis && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Page Analysis:</strong>
                  <pre style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(testResults.allPagesTest.pageAnalysis, null, 2)}
                  </pre>
                </div>
              )}
              {testResults.allPagesTest.timing && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Timing:</strong>
                  <pre style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(testResults.allPagesTest.timing, null, 2)}
                  </pre>
                </div>
              )}
              {testResults.allPagesTest.errors && testResults.allPagesTest.errors.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Errors:</strong>
                  <ul>
                    {testResults.allPagesTest.errors.map((error, index) => (
                      <li key={index} style={{ color: 'red' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <details>
                <summary>📋 Full Response</summary>
                <pre style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
                  {JSON.stringify(testResults.allPagesTest, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>Chưa có kết quả test</p>
          )}
        </div>
      </div>

      {/* Console Log Instructions */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: '#e9ecef', 
        borderRadius: '8px' 
      }}>
        <h3>📝 Console Log Instructions</h3>
        <p>Mở Developer Tools (F12) và xem tab Console để theo dõi chi tiết luồng dữ liệu:</p>
        <ul>
          <li>🧪 [TEST] - Logs từ test functions</li>
          <li>📖 [RANGE-PAGE] - Logs từ translateRangePage service</li>
          <li>📖 [ALL-PAGES] - Logs từ translateAllPages service</li>
          <li>🚀 [RANGE-PAGES-API] - Logs từ backend range-pages endpoint</li>
          <li>🚀 [ALL-PAGES-API] - Logs từ backend all-pages endpoint</li>
          <li>📤 Request data - Dữ liệu gửi lên backend</li>
          <li>📥 Response data - Dữ liệu nhận từ backend</li>
        </ul>
      </div>
    </div>
  );
};

export default TranslationTestPage;
