// --- Thao tác với DefaultKey ---
const prisma = require("../../config/prismaConfig");
const fs = require('fs').promises;
const path = require('path');

async function getAllDefaultKeys() {
try {
return await prisma.defaultKey.findMany({
include: { model: true }, // Nếu model liên kết với bảng Model
});
} catch (error) {
console.error("Lỗi khi lấy tất cả default keys:", error);
throw error;
}
}

async function getDefaultKeyById(id) {
try {
return await prisma.defaultKey.findUnique({
where: { id },
include: { model: true },
});
} catch (error) {
console.error('Lỗi khi lấy default key với ID ${id}:', error);
throw error;
}
}

async function createDefaultKey({ key, modelId }) {
try {
return await prisma.defaultKey.create({
data: { key, modelId },
});
} catch (error) {
console.error("Lỗi khi tạo default key:", error);
throw error;
}
}

async function updateDefaultKey(id, { key, modelId }) {
try {
return await prisma.defaultKey.update({
where: { id },
data: { key, modelId },
});
} catch (error) {
console.error('Lỗi khi cập nhật default key với ID ${id}:', error);
throw error;
}
}

async function deleteDefaultKey(id) {
try {
return await prisma.defaultKey.delete({
where: { id },
});
} catch (error) {
console.error('Lỗi khi xóa default key với ID ${id}:', error);
throw error;
}
}

module.exports = {
getAllDefaultKeys,
getDefaultKeyById,
createDefaultKey,
updateDefaultKey,
deleteDefaultKey,
};