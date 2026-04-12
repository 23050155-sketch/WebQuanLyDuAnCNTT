// API Configuration
const API_BASE_URL = "http://127.0.0.1:8000";

// Lấy token từ localStorage
function getToken() {
    return localStorage.getItem("access_token");
}

// Lấy user info từ localStorage
function getUserInfo() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
}

// Lưu user info
function setUserInfo(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

// Lưu token
function setToken(token) {
    localStorage.setItem("access_token", token);
}

// Xóa token và user info
function clearAuth() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
}

// Kiểm tra đã đăng nhập chưa
function isAuthenticated() {
    return !!getToken();
}

// API request wrapper
async function apiRequest(endpoint, method = "GET", data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        "Content-Type": "application/json",
    };
    
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers,
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            clearAuth();
            window.location.href = "login.html";
            throw new Error("Vui lòng đăng nhập lại");
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || "Có lỗi xảy ra");
        }
        
        return result;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// Auth APIs
async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    
    const response = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
    });
    
    if (!response.ok) {
        let errorMessage = "Sai tên đăng nhập hoặc mật khẩu";
        try {
            const error = await response.json();
            errorMessage = error.detail || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    setToken(data.access_token);
    
    // Lưu thông tin user
    const user = {
        user_id: data.user_id,
        username: data.username,
        fullname: data.fullname,
        role: data.role
    };
    setUserInfo(user);
    
    return user;
}

async function logout() {
    clearAuth();
    window.location.href = "index.html";
}

// User APIs
async function getCurrentUser() {
    return await apiRequest("/users/me");
}

// Project APIs
async function createProject(projectData) {
    return await apiRequest("/projects", "POST", projectData);
}

async function getProjects() {
    return await apiRequest("/projects");
}

async function getProject(projectId) {
    return await apiRequest(`/projects/${projectId}`);
}

async function getMyProjects() {
    const user = getUserInfo();
    if (!user) return [];
    return await apiRequest(`/project-members/user/${user.user_id}`);
}

async function checkProjectAccess(projectId) {
    const user = getUserInfo();
    if (!user) return false;
    
    try {
        const members = await apiRequest(`/projects/${projectId}/members`);
        return members.some(m => m.user_id === user.user_id);
    } catch (error) {
        return false;
    }
}

// Project Member APIs
async function addProjectMember(projectId, userId, role) {
    return await apiRequest("/project-members", "POST", {
        project_id: projectId,
        user_id: userId,
        role_in_project: role
    });
}

async function getProjectMembers(projectId) {
    return await apiRequest(`/projects/${projectId}/members`);
}

// Task APIs
async function createTask(taskData) {
    return await apiRequest("/tasks", "POST", taskData);
}

async function getProjectTasks(projectId) {
    return await apiRequest(`/tasks/project/${projectId}`);
}

async function updateTask(taskId, taskData) {
    return await apiRequest(`/tasks/${taskId}`, "PUT", taskData);
}

// Cost Estimate APIs
async function createCostEstimate(estimateData) {
    return await apiRequest("/cost-estimates", "POST", estimateData);
}

async function getProjectCostEstimates(projectId) {
    return await apiRequest(`/cost-estimates?project_id=${projectId}`);
}

async function getCostSummary(projectId) {
    return await apiRequest(`/cost-estimates/summary/${projectId}`);
}