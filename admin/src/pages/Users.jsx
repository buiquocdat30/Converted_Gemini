import React, { useState, useEffect } from "react";
import { Eye, Edit, Trash2 } from "lucide-react";
import { usersAPI } from "../services/api";
import toast from "react-hot-toast";
import UserModal from "../components/UserModal/UserModal";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      console.log("Đây là dữ liệu về user:",response.data.data)
      setUsers(response.data.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Lỗi khi tải danh sách users");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa user này? Hành động này sẽ xóa tất cả dữ liệu liên quan."
      )
    ) {
      return;
    }

    try {
      await usersAPI.delete(id);
      toast.success("Xóa user thành công");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.message || "Lỗi khi xóa user");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="card">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Đang tải...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quản lý Users</h2>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <strong>{user.username}</strong>
                      {user.birthdate && (
                        <div className="text-sm text-gray-600">
                          {new Date(user.birthdate).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleEdit(user)}
                      title="Xem/Sửa"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={() => handleEdit(user)}
                      title="Sửa"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(user.id)}
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">Chưa có user nào</div>
        )}
      </div>

      {showModal && (
        <UserModal
          key={editingUser?.id || "new"}
          user={editingUser}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default Users;
