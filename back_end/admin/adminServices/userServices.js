// --- Thao tác với User ---
const { prisma } = require("../../config/prismaConfig");
const fs = require('fs').promises;
const path = require('path');

async function getAllUsers() {
    try {
        const users = await prisma.user.findMany({
            where: {
                email: { not: null, not: '' }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Chuyển birthdate về ISO string hoặc null
        if(users){
            return users.map(user => ({
                ...user,
                birthdate: user.birthdate ? new Date(user.birthdate).toISOString() : null
            }));
        } return null;
       
    } catch (error) {
        console.error("Lỗi khi lấy tất cả users:", error);
        throw error;
    }
}

async function getUserById(id) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                UserApiKey: true,
                libraryStories: true,
            },
        });
        // Chuyển birthdate về ISO string hoặc null
        return user ? { ...user, birthdate: user.birthdate ? new Date(user.birthdate).toISOString() : null } : null;
    } catch (error) {
        console.error('Lỗi khi lấy user với ID ${id}:', error);
        throw error;
    }
}

async function createUser({ email, username, password, avatar, birthdate }) {
    try {
        return await prisma.user.create({
            data: { email, username, password, avatar, birthdate },
        });
    } catch (error) {
        console.error("Lỗi khi tạo user:", error);
        throw error;
    }
}

async function updateUser(id, { email, username, password, avatar, birthdate }) {
    try {
        return await prisma.user.update({
            where: { id },
            data: { email, username, password, avatar, birthdate },
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật user với ID ${id}:', error);
        throw error;
    }
}

async function deleteUser(id) {
    try {
        return await prisma.user.delete({
            where: { id },
        });
    } catch (error) {
        console.error('Lỗi khi xóa user với ID ${id}:', error);
        throw error;
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};