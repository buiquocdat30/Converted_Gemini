import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useSearchParams, useNavigate } from 'react-router-dom';
import Translate from './Translate';
import * as indexedDBService from '../services/indexedDBService';
import axios from 'axios';
import { AuthContext } from '../context/ConverteContext';
import { useSession } from '../context/SessionContext';

// Mock các module cần thiết
jest.mock('axios');
jest.mock('../services/indexedDBService');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: jest.fn(),
  useNavigate: jest.fn(),
}));

// Mock AuthContext và useSession
const mockAuthContextValue = {
  isLoggedIn: true,
  stories: [],
  fetchStories: jest.fn(),
  editStories: jest.fn(),
  hideStories: jest.fn(),
  deleteStories: jest.fn(),
  addChapter: jest.fn(),
  deleteChapter: jest.fn(),
  getAuthToken: jest.fn(() => 'test-token'),
  updateChapterContent: jest.fn(),
  isDarkMode: false,
};

const mockUseSessionValue = {
  selectedModel: { rpm: 60, modelName: "gemini-1.5-flash" },
};

// Wrapper để cung cấp context và router cho component
const Wrapper = ({ children }) => (
  <AuthContext.Provider value={mockAuthContextValue}>
    <useSession.Provider value={mockUseSessionValue}> {/* Cần mock useSession nếu nó không được tự động mock */}
      <BrowserRouter>{children}</BrowserRouter>
    </useSession.Provider>
  </AuthContext.Provider>
);

describe('Translate Component - IndexedDB Caching', () => {
  beforeEach(() => {
    // Reset mocks trước mỗi test
    jest.clearAllMocks();

    // Thiết lập mock cho useSearchParams và useNavigate
    useSearchParams.mockReturnValue([new URLSearchParams()]);
    useNavigate.mockReturnValue(jest.fn());

    // Giả lập localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'auth-token') return 'test-token';
      return null;
    });
  });

  it('should fetch chapters from IndexedDB first, then from network, and update IndexedDB', async () => {
    const storyId = 'story123';
    const mockChaptersFromDB = [
      { id: 'ch1', chapterNumber: 1, chapterName: 'Chương 1 (Cached)', rawText: 'Nội dung chương 1 (cached)', translatedContent: 'Translated content 1 (cached)' },
      { id: 'ch2', chapterNumber: 2, chapterName: 'Chương 2 (Cached)', rawText: 'Nội dung chương 2 (cached)', translatedContent: 'Translated content 2 (cached)' },
    ];
    const mockChaptersFromNetwork = [
      { id: 'ch1', chapterNumber: 1, chapterName: 'Chương 1 (Network)', rawText: 'Nội dung chương 1 (network)', translation: { translatedContent: 'Translated content 1 (network)' } },
      { id: 'ch2', chapterNumber: 2, chapterName: 'Chương 2 (Network)', rawText: 'Nội dung chương 2 (network)', translation: { translatedContent: 'Translated content 2 (network)' } },
      { id: 'ch3', chapterNumber: 3, chapterName: 'Chương 3 (Network)', rawText: 'Nội dung chương 3 (network)' },
    ];

    // Mock API responses
    axios.get.mockImplementation((url) => {
      if (url.includes(`/user/library/${storyId}/chapters`)) {
        return Promise.resolve({
          data: { chapters: mockChaptersFromNetwork, totalChaptersCount: mockChaptersFromNetwork.length },
        });
      } else if (url.includes(`/user/library/${storyId}`)) {
        return Promise.resolve({
          data: { id: storyId, title: 'Test Story' },
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Mock IndexedDB service
    indexedDBService.getChaptersByStoryIdAndRange.mockResolvedValueOnce(mockChaptersFromDB); // Lần đầu từ cache
    indexedDBService.addChapters.mockResolvedValue(true);
    indexedDBService.clearChapters.mockResolvedValue(true);

    // Thiết lập URL với storyId
    useSearchParams.mockReturnValue([new URLSearchParams('storyId=story123&tab=translating')]);

    render(<Translate />, { wrapper: Wrapper });

    // Chờ cho chapter list hiển thị (từ cache)
    await waitFor(() => {
      expect(screen.getByText('Chương 1 (Cached):')).toBeInTheDocument();
      expect(screen.getByText('Translated content 1 (cached)')).toBeInTheDocument();
    });

    // Đảm bảo getChaptersByStoryIdAndRange được gọi
    expect(indexedDBService.getChaptersByStoryIdAndRange).toHaveBeenCalledWith(storyId, 1, 10);

    // Chờ cho API call hoàn thành và cập nhật UI (từ network)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(`http://localhost:8000/user/library/${storyId}/chapters?page=1&limit=10`, expect.any(Object));
      expect(screen.getByText('Chương 1 (Network):')).toBeInTheDocument();
      expect(screen.getByText('Translated content 1 (network)')).toBeInTheDocument();
    });

    // Đảm bảo clear và add chapters được gọi để cập nhật cache
    await waitFor(() => {
      expect(indexedDBService.clearChapters).toHaveBeenCalledWith(storyId, 1, 10);
      expect(indexedDBService.addChapters).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ chapterName: 'Chương 1 (Network)' }),
        expect.objectContaining({ chapterName: 'Chương 2 (Network)' }),
        expect.objectContaining({ chapterName: 'Chương 3 (Network)' }),
      ]));
    });
  });

  it('should fetch chapters directly from network if no cache is available', async () => {
    const storyId = 'story456';
    const mockChaptersFromNetwork = [
      { id: 'ch4', chapterNumber: 4, chapterName: 'Chương 4 (Network)', rawText: 'Nội dung chương 4' },
    ];

    axios.get.mockImplementation((url) => {
      if (url.includes(`/user/library/${storyId}/chapters`)) {
        return Promise.resolve({
          data: { chapters: mockChaptersFromNetwork, totalChaptersCount: mockChaptersFromNetwork.length },
        });
      } else if (url.includes(`/user/library/${storyId}`)) {
        return Promise.resolve({
          data: { id: storyId, title: 'Another Story' },
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    indexedDBService.getChaptersByStoryIdAndRange.mockResolvedValueOnce([]); // Không có cache
    indexedDBService.addChapters.mockResolvedValue(true);
    indexedDBService.clearChapters.mockResolvedValue(true);

    useSearchParams.mockReturnValue([new URLSearchParams('storyId=story456&tab=translating')]);

    render(<Translate />, { wrapper: Wrapper });

    // Chờ cho API call hoàn thành và hiển thị từ network
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(`http://localhost:8000/user/library/${storyId}/chapters?page=1&limit=10`, expect.any(Object));
      expect(screen.getByText('Chương 4 (Network):')).toBeInTheDocument();
    });

    // Đảm bảo addChapters được gọi để lưu vào cache
    await waitFor(() => {
      expect(indexedDBService.addChapters).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ chapterName: 'Chương 4 (Network)' }),
      ]));
    });
    expect(indexedDBService.clearChapters).not.toHaveBeenCalledWith(storyId, 1, 10);
  });

  it('should clear chapters from IndexedDB when a story is deleted', async () => {
    const storyIdToDelete = 'story789';
    const mockChapters = [
      { id: 'ch7', chapterNumber: 7, chapterName: 'Chương 7', rawText: 'Nội dung chương 7' },
    ];

    // Mock API responses
    axios.get.mockImplementation((url) => {
      if (url.includes(`/user/library/${storyIdToDelete}/chapters`)) {
        return Promise.resolve({
          data: { chapters: mockChapters, totalChaptersCount: mockChapters.length },
        });
      } else if (url.includes(`/user/library/${storyIdToDelete}`)) {
        return Promise.resolve({ data: { id: storyIdToDelete, title: 'Story to Delete' } });
      }
      return Promise.reject(new Error(`Unhandled GET URL: ${url}`));
    });
    axios.delete.mockResolvedValue({}); // Mock API delete
    mockAuthContextValue.deleteStories.mockResolvedValue({}); // Mock AuthContext delete

    // Mock IndexedDB service
    indexedDBService.getChaptersByStoryIdAndRange.mockResolvedValueOnce([]);
    indexedDBService.addChapters.mockResolvedValue(true);
    indexedDBService.clearChapters.mockResolvedValue(true);

    // Thiết lập URL với storyId
    useSearchParams.mockReturnValue([new URLSearchParams(`storyId=${storyIdToDelete}&tab=translating`)]);

    render(<Translate />, { wrapper: Wrapper });

    // Đảm bảo truyện được tải
    await waitFor(() => {
      expect(screen.getByText('Chương 7:')).toBeInTheDocument();
    });

    // Quay lại danh sách truyện để có thể xóa
    const navigateMock = useNavigate();
    userEvent.click(screen.getByText('Quay lại chọn truyện'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/translate");
    });

    // Mock lại danh sách stories trong AuthContext để hiển thị UserStoryCard
    mockAuthContextValue.stories = [{ id: storyIdToDelete, title: 'Story to Delete', isComplete: false }];

    render(<Translate />, { wrapper: Wrapper }); // Re-render để cập nhật stories

    // Chờ cho UserStoryCard hiển thị
    await waitFor(() => {
      expect(screen.getByText('Story to Delete')).toBeInTheDocument();
    });

    // Click nút xóa
    window.confirm = jest.fn(() => true); // Mock confirm dialog
    userEvent.click(screen.getByRole('button', { name: /❌ Xóa/i }));

    // Đảm bảo deleteStories và clearChapters được gọi
    await waitFor(() => {
      expect(mockAuthContextValue.deleteStories).toHaveBeenCalledWith(storyIdToDelete);
      expect(indexedDBService.clearChapters).toHaveBeenCalledWith(storyIdToDelete); // Xóa toàn bộ cache của story
    });
  });

});
