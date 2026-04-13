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
            window.location.href = "/html/login.html";
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

// ==================== AUTH APIS ====================
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
    
    const user = {
        user_id: data.user_id,
        username: data.username,
        fullname: data.fullname,
        role: data.role
    };
    setUserInfo(user);
    
    return user;
}

function logout() {
    clearAuth();
    window.location.href = "/html/login.html";
}

// ==================== USER APIS ====================
async function getCurrentUser() {
    return await apiRequest("/users/me");
}

async function getUsers() {
    try {
        const response = await apiRequest("/users");
        console.log("getUsers response:", response);
        
        // Kiểm tra cấu trúc dữ liệu trả về
        if (response && Array.isArray(response)) {
            return response;
        } else if (response && response.data && Array.isArray(response.data)) {
            return response.data;
        } else if (response && response.users && Array.isArray(response.users)) {
            return response.users;
        } else {
            console.warn("Unexpected users response format:", response);
            return [];
        }
    } catch (error) {
        console.error("Error in getUsers:", error);
        return [];
    }
}

// ==================== PROJECT APIS ====================
async function createProject(projectData) {
    return await apiRequest("/projects", "POST", projectData);
}

async function getProjects() {
    return await apiRequest("/projects");
}

async function getProject(projectId) {
    return await apiRequest(`/projects/${projectId}`);
}

async function updateProject(projectId, projectData) {
    return await apiRequest(`/projects/${projectId}`, "PUT", projectData);
}

async function deleteProjectAPI(projectId) {
    return await apiRequest(`/projects/${projectId}`, "DELETE");
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
        // Kiểm tra nếu user là người tạo project
        const project = await getProject(projectId);
        if (project.created_by === user.user_id) {
            return true;
        }
        
        // Kiểm tra trong danh sách members
        const members = await getProjectMembers(projectId);
        console.log("Members for access check:", members);
        return members.some(m => {
            const memberUserId = m.user_id || m.userId;
            return memberUserId === user.user_id;
        });
    } catch (error) {
        console.error("Error checking access:", error);
        return false;
    }
}

// ==================== PROJECT MEMBER APIS ====================
async function addProjectMember(projectId, userId, role) {
    return await apiRequest("/project-members", "POST", {
        project_id: projectId,
        user_id: userId,
        role_in_project: role
    });
}

async function getProjectMembers(projectId) {
    try {
        console.log("Calling getProjectMembers for:", projectId);
        // Gọi API đúng endpoint
        const result = await apiRequest(`/projects/${projectId}/members`);
        console.log("getProjectMembers raw result:", result);
        
        // Xử lý nhiều định dạng response khác nhau
        if (result && Array.isArray(result)) {
            return result;
        } else if (result && result.data && Array.isArray(result.data)) {
            return result.data;
        } else if (result && result.members && Array.isArray(result.members)) {
            return result.members;
        } else if (result && result.items && Array.isArray(result.items)) {
            return result.items;
        } else {
            console.warn("Unexpected response format from getProjectMembers:", result);
            return [];
        }
    } catch (error) {
        console.error("Error in getProjectMembers:", error);
        return [];
    }
}

async function getUserProjects(userId) {
    return await apiRequest(`/project-members/user/${userId}`);
}

async function updateProjectMember(memberId, data) {
    return await apiRequest(`/project-members/${memberId}`, "PUT", data);
}

async function deleteProjectMember(memberId) {
    return await apiRequest(`/project-members/${memberId}`, "DELETE");
}

// ==================== TASK APIS ====================
async function createTask(taskData) {
    return await apiRequest("/tasks", "POST", taskData);
}

async function getProjectTasks(projectId) {
    return await apiRequest(`/tasks/project/${projectId}`);
}

async function getTask(taskId) {
    return await apiRequest(`/tasks/${taskId}`);
}

async function updateTask(taskId, taskData) {
    return await apiRequest(`/tasks/${taskId}`, "PUT", taskData);
}

async function deleteTask(taskId) {
    return await apiRequest(`/tasks/${taskId}`, "DELETE");
}

// ==================== COST ESTIMATE APIS ====================
async function createCostEstimate(estimateData) {
    return await apiRequest("/cost-estimates", "POST", estimateData);
}

async function getProjectCostEstimates(projectId) {
    return await apiRequest(`/cost-estimates?project_id=${projectId}`);
}

async function getCostSummary(projectId) {
    return await apiRequest(`/cost-estimates/summary/${projectId}`);
}

async function updateCostEstimate(estimateId, data) {
    return await apiRequest(`/cost-estimates/${estimateId}`, "PUT", data);
}

async function deleteCostEstimate(estimateId) {
    return await apiRequest(`/cost-estimates/${estimateId}`, "DELETE");
}

// ==================== EXPERT TIME ESTIMATE APIS ====================
async function createExpertTimeEstimate(estimateData) {
    return await apiRequest("/expert-time-estimates", "POST", estimateData);
}

async function getExpertTimeEstimatesByTask(taskId) {
    return await apiRequest(`/expert-time-estimates?task_id=${taskId}`);
}

async function updateExpertTimeEstimate(estimateId, data) {
    return await apiRequest(`/expert-time-estimates/${estimateId}`, "PUT", data);
}

async function deleteExpertTimeEstimate(estimateId) {
    return await apiRequest(`/expert-time-estimates/${estimateId}`, "DELETE");
}