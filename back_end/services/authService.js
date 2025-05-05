const prisma = require("../config/prismaConfig");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret_ecom";


async function registerUser(username, email, password) {
  // Kiểm tra xem prisma có phải là undefined không ngay trước khi gọi findUnique
  if (!prisma) {
    console.error("Lỗi: prisma là undefined!",prisma.user);
    return { success: false, error: "Lỗi khởi tạo Prisma Client" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email đã tồn tại");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
  });
  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET);
  return { token };
}

async function loginUser(email, password) {

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Email không tồn tại");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new Error("Mật khẩu không đúng");
  }
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET,);
  return { token, username: user.username };
}

module.exports = { registerUser, loginUser };
