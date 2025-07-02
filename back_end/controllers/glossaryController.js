const { 
  getGlossaryByStoryId, 
  deleteGlossaryItem, 
  updateGlossaryItem, 
  searchGlossaryItems 
} = require("../services/glossaryService");

// Lấy tất cả glossary items của một truyện
exports.getGlossary = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?.id;

    if (!storyId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu storyId" 
      });
    }

    console.log(`📚 Lấy glossary cho truyện ${storyId}`);

    const glossaryItems = await getGlossaryByStoryId(storyId);

    res.json({
      success: true,
      message: "Lấy glossary thành công",
      data: glossaryItems
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy glossary:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy glossary",
      error: error.message
    });
  }
};

// Xóa một glossary item
exports.deleteGlossaryItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;

    if (!itemId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu itemId" 
      });
    }

    console.log(`🗑️ Xóa glossary item ${itemId}`);

    const success = await deleteGlossaryItem(itemId);

    if (success) {
      res.json({
        success: true,
        message: "Xóa glossary item thành công"
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy glossary item"
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi xóa glossary item:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa glossary item",
      error: error.message
    });
  }
};

// Cập nhật một glossary item
exports.updateGlossaryItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { original, translated, type, lang } = req.body;
    const userId = req.user?.id;

    if (!itemId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu itemId" 
      });
    }

    console.log(`✏️ Cập nhật glossary item ${itemId}`);

    const updatedItem = await updateGlossaryItem(itemId, {
      original,
      translated,
      type,
      lang
    });

    if (updatedItem) {
      res.json({
        success: true,
        message: "Cập nhật glossary item thành công",
        data: updatedItem
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy glossary item"
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật glossary item:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật glossary item",
      error: error.message
    });
  }
};

// Tìm kiếm glossary items
exports.searchGlossaryItems = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { keyword } = req.query;
    const userId = req.user?.id;

    if (!storyId) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu storyId" 
      });
    }

    if (!keyword) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu từ khóa tìm kiếm" 
      });
    }

    console.log(`🔍 Tìm kiếm glossary cho truyện ${storyId} với từ khóa: ${keyword}`);

    const items = await searchGlossaryItems(storyId, keyword);

    res.json({
      success: true,
      message: "Tìm kiếm glossary thành công",
      data: items
    });
  } catch (error) {
    console.error("❌ Lỗi khi tìm kiếm glossary:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tìm kiếm glossary",
      error: error.message
    });
  }
}; 