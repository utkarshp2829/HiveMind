import React, { useState } from "react";

const Login = ({ onLogin }) => {
  const [role, setRole] = useState("student");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (id.trim() === "" || password.trim() === "") {
      alert("Please enter both ID and password");
      return;
    }

    // Random check: any non-empty values work
    onLogin({ username: id, role });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="bg-white rounded-3xl shadow-2xl w-96 p-8">
        <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to HiveMind
        </h2>

        {/* Role Tabs */}
        <div className="flex justify-center mb-6">
          {["student", "teacher"].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setId(""); setPassword(""); }}
              className={`px-6 py-2 rounded-t-xl font-medium transition-colors ${
                role === r
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {role === "student" ? "Student ID" : "Teacher ID"}
            </label>
            <input
              type="text"
              placeholder={role === "student" ? "Enter Student ID" : "Enter Teacher ID"}
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Login
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
